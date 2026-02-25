(function () {
  let inModal = false
  let tasks = []
  let currentTaskIndex = 0
  let loggingActive = false
  let taskStartTime = null
  let currentLog = []
  let allLogs = []
  let annotationCount = 0
  let editCount = 0
  let deleteCount = 0
  let timeCheckInterval = null

  const loadState = () => {
    try {
      const stored = localStorage.getItem('logger_state')
      if (stored) {
        const state = JSON.parse(stored)
        tasks = state.tasks || []
        currentTaskIndex = state.currentTaskIndex || 0
        allLogs = state.allLogs || []
        loggingActive = state.loggingActive || false
        taskStartTime = state.taskStartTime
          ? new Date(state.taskStartTime)
          : null
        currentLog = state.currentLog || []
        annotationCount = state.annotationCount || 0
        editCount = state.editCount || 0
        deleteCount = state.deleteCount || 0
      }
    } catch (e) {
      console.error('Error loading state:', e)
    }
  }

  const persistState = () => {
    try {
      localStorage.setItem(
        'logger_state',
        JSON.stringify({
          tasks,
          currentTaskIndex,
          allLogs,
          loggingActive,
          taskStartTime: taskStartTime ? taskStartTime.toISOString() : null,
          currentLog,
          annotationCount,
          editCount,
          deleteCount
        })
      )
    } catch (e) {
      console.error('Error persisting state:', e)
    }
  }

  const createLoggerUI = () => {
    if (document.getElementById('logger-panel')) return

    const panel = document.createElement('div')
    panel.id = 'logger-panel'
    panel.style.position = 'fixed'
    panel.style.bottom = '10px'
    panel.style.right = '10px'
    panel.style.backgroundColor = '#222'
    panel.style.color = '#fff'
    panel.style.border = '1px solid #555'
    panel.style.padding = '6px'
    panel.style.borderRadius = '8px'
    panel.style.zIndex = '9999'
    panel.style.fontFamily = 'Arial, sans-serif'
    panel.style.fontSize = '13px'
    panel.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5)'

    panel.innerHTML = `
      <div id="logger-content">
        <div id="load-section" style="text-align: center;">
          <button id="load-tasks" style="padding: 6px 12px; border-radius: 4px; border: none; background: #007bff; color: white; cursor: pointer; font-size: 12px; font-weight: bold;">Load Tasks</button>
          <input type="file" id="task-file-input" accept=".json" style="display: none;">
        </div>
        <div id="task-section" style="display: none;">
          <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 4px;">
            <div><strong>Task:</strong> <span id="logger-task">-</span></div>
          </div>
          <div style="margin-bottom: 6px;"><strong>Status:</strong> <span id="logger-status" style="color: #f00">Not Active</span></div>
          <div style="display: flex; gap: 4px; margin-bottom: 4px;">
            <button id="start-task" style="flex: 1; padding: 4px 6px; border-radius: 4px; border: none; cursor: pointer; font-size: 11px; font-weight: bold; background-color: rgba(3, 159, 3, 1); color: #fff; max-width: 70px;">Start</button>
            <button id="skip-task" style="flex: 1; padding: 4px 6px; border-radius: 4px; border: none; cursor: pointer; font-size: 11px; font-weight: bold; background-color: #ffc107; color: #000; max-width: 70px;">Skip</button>
            <button id="finish-task" style="flex: 1; padding: 4px 6px; border-radius: 4px; border: none; cursor: pointer; font-size: 11px; font-weight: bold; background-color: #dc3545; color: #fff; max-width: 70px; display: none;">Finish</button>
          </div>
          <button id="export-logger" style="width: calc(2 * 70px + 4px); padding: 6px; border-radius: 4px; border: none; cursor: pointer; background: #333; color: #fff; font-size: 12px; font-weight: bold; display: block; margin: 0 auto;">Export</button>
        </div>
      </div>
    `

    document.body.appendChild(panel)

    document.getElementById('load-tasks').onclick = () => {
      document.getElementById('task-file-input').click()
    }

    document.getElementById('task-file-input').onchange = handleFileSelect
    document.getElementById('start-task').onclick = startTask
    document.getElementById('skip-task').onclick = skipTask
    document.getElementById('finish-task').onclick = finishTask
    document.getElementById('export-logger').onclick = exportData
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        tasks = JSON.parse(event.target.result)
        if (!Array.isArray(tasks) || tasks.length === 0) {
          alert('Invalid task file format. Expected an array of tasks.')
          return
        }

        for (let task of tasks) {
          if (
            !task.description ||
            !task.maxTime ||
            !task.targetAnnotations ||
            !task.type
          ) {
            alert(
              'Invalid task format. Each task must have: description, maxTime, targetAnnotations, and type.'
            )
            return
          }
          if (!['M', 'A'].includes(task.type)) {
            alert('Invalid task type. Must be M or A.')
            return
          }
        }

        currentTaskIndex = 0
        allLogs = []
        loggingActive = false
        annotationCount = 0
        editCount = 0
        deleteCount = 0
        document.getElementById('load-section').style.display = 'none'
        document.getElementById('task-section').style.display = 'block'
        updatePanel()
        persistState()
      } catch (err) {
        alert('Error parsing JSON file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  const updatePanel = () => {
    if (tasks.length === 0) return

    document.getElementById('logger-task').textContent = currentTaskIndex + 1

    const statusEl = document.getElementById('logger-status')
    statusEl.textContent = loggingActive ? 'Active' : 'Not Active'
    statusEl.style.color = loggingActive ? '#0f0' : '#f00'

    const startBtn = document.getElementById('start-task')
    const skipBtn = document.getElementById('skip-task')
    const finishBtn = document.getElementById('finish-task')
    const currentTask = tasks[currentTaskIndex]

    if (loggingActive) {
      startBtn.style.display = 'none'
      skipBtn.style.display = 'none'
      
      // Finish button sa zobrazuje len pre úlohy typu 'A'
      if (currentTask.type === 'A') {
        finishBtn.style.display = 'block'
        finishBtn.disabled = false
        finishBtn.style.cursor = 'pointer'
        finishBtn.style.backgroundColor = '#dc3545'
      } else {
        finishBtn.style.display = 'none'
      }
    } else {
      startBtn.style.display = 'block'
      skipBtn.style.display = 'block'
      finishBtn.style.display = 'none'
      startBtn.disabled = false
      startBtn.style.cursor = 'pointer'
      startBtn.style.backgroundColor = 'rgba(3, 161, 3, 1)'
      skipBtn.disabled = false
      skipBtn.style.cursor = 'pointer'
      skipBtn.style.backgroundColor = '#daa400ff'
    }
  }

  const startTask = () => {
    if (loggingActive) return

    loggingActive = true
    taskStartTime = new Date()
    currentLog = []
    annotationCount = 0
    editCount = 0
    deleteCount = 0
    updatePanel()
    persistState()

    timeCheckInterval = setInterval(() => {
      if (!loggingActive) {
        clearInterval(timeCheckInterval)
        return
      }

      const elapsed = (new Date() - taskStartTime) / 1000
      const currentTask = tasks[currentTaskIndex]

      if (elapsed >= currentTask.maxTime) {
        clearInterval(timeCheckInterval)
        completeTask('timeout')
      }
    }, 1000)
  }

  const completeTask = (reason) => {
    if (!loggingActive || !taskStartTime) return

    loggingActive = false
    if (timeCheckInterval) {
      clearInterval(timeCheckInterval)
      timeCheckInterval = null
    }

    const now = new Date()
    const taskDuration = (now - taskStartTime) / 1000
    const currentTask = tasks[currentTaskIndex]

    showDifficultyModal((difficulty) => {
      if (currentTask.type === 'A') {
        showAITrustModal((aiTrust) => {
          const taskData = {
            task: `task${currentTaskIndex + 1}`,
            type: currentTask.type,
            description: currentTask.description,
            targetAnnotations: currentTask.targetAnnotations,
            createdAnnotations: annotationCount,
            editedAnnotations: editCount,
            deletedAnnotations: deleteCount,
            duration: taskDuration,
            maxTime: currentTask.maxTime,
            completionReason: reason,
            completedGoal: annotationCount >= currentTask.targetAnnotations,
            completedInTime: taskDuration <= currentTask.maxTime,
            difficulty: difficulty,
            aiTrustChange: aiTrust,
            clicks: currentLog.filter((e) => e.type === 'click').length,
            events: currentLog
          }
          allLogs.push(taskData)
          moveToNextTask()
        })
      } else {
        const taskData = {
          task: `task${currentTaskIndex + 1}`,
          type: currentTask.type,
          description: currentTask.description,
          targetAnnotations: currentTask.targetAnnotations,
          createdAnnotations: annotationCount,
          editedAnnotations: editCount,
          deletedAnnotations: deleteCount,
          duration: taskDuration,
          maxTime: currentTask.maxTime,
          completionReason: reason,
          completedGoal: annotationCount >= currentTask.targetAnnotations,
          completedInTime: taskDuration <= currentTask.maxTime,
          difficulty: difficulty,
          clicks: currentLog.filter((e) => e.type === 'click').length,
          events: currentLog
        }
        allLogs.push(taskData)
        moveToNextTask()
      }
    })
  }

  const moveToNextTask = () => {
    currentTaskIndex++
    taskStartTime = null
    currentLog = []
    annotationCount = 0
    editCount = 0
    deleteCount = 0

    persistState()

    if (currentTaskIndex >= tasks.length) {
      showCompletionMessage()
    } else {
      updatePanel()
    }
  }

  const skipTask = () => {
    if (loggingActive) return

    const currentTask = tasks[currentTaskIndex]
    const taskData = {
      task: `task${currentTaskIndex + 1}`,
      type: currentTask.type,
      description: currentTask.description,
      targetAnnotations: currentTask.targetAnnotations,
      createdAnnotations: 0,
      editedAnnotations: 0,
      deletedAnnotations: 0,
      duration: 0,
      maxTime: currentTask.maxTime,
      completionReason: 'skipped',
      completedGoal: false,
      completedInTime: false,
      difficulty: null,
      clicks: 0,
      events: [],
      skipped: true
    }
    allLogs.push(taskData)

    currentTaskIndex++
    annotationCount = 0
    editCount = 0
    deleteCount = 0
    persistState()

    if (currentTaskIndex >= tasks.length) {
      showCompletionMessage()
    } else {
      updatePanel()
    }
  }

  const finishTask = () => {
    if (!loggingActive) return
    completeTask('manual_finish')
  }

  const showCompletionMessage = () => {
    document.getElementById('task-section').innerHTML = `
      <div style="text-align: center; padding: 15px;">
        <h4 style="color: #28a745; margin-bottom: 8px; font-size: 14px;">Complete!</h4>
        <p style="margin-bottom: 10px; font-size: 12px;">All ${tasks.length} tasks done.</p>
        <button id="export-final" style="padding: 6px 12px; border-radius: 4px; border: none; background: #007bff; color: white; cursor: pointer; font-size: 12px; font-weight: bold;">Export</button>
      </div>
    `
    document.getElementById('export-final').onclick = exportData
  }

  const showDifficultyModal = (onSubmit) => {
    inModal = true
    const modal = document.createElement('div')
    modal.style.position = 'fixed'
    modal.style.top = '0'
    modal.style.left = '0'
    modal.style.width = '100vw'
    modal.style.height = '100vh'
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)'
    modal.style.display = 'flex'
    modal.style.justifyContent = 'center'
    modal.style.alignItems = 'center'
    modal.style.zIndex = '99999'

    const box = document.createElement('div')
    box.style.background = '#333'
    box.style.color = '#fff'
    box.style.padding = '20px 30px'
    box.style.borderRadius = '10px'
    box.style.textAlign = 'center'
    box.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'
    box.style.fontFamily = 'Arial, sans-serif'
    box.style.fontSize = '14px'
    box.style.minWidth = '350px'

    box.innerHTML = `
      <h3 style="margin-bottom: 12px;">Rate the difficulty of the task</h3>
      <p style="margin-bottom: 12px; white-space: nowrap;">Choose a number from 1 (Very Difficult) to 7 (Very Easy)</p>
      <div id="difficulty-buttons" style="display: flex; justify-content: center; gap: 6px;">
        ${[1, 2, 3, 4, 5, 6, 7]
          .map(
            (n) =>
              `<button style="padding: 12px 16px; border-radius: 6px; border: 1px solid #777; background: #555; color: #fff; cursor: pointer; font-weight: bold;" data-val="${n}">${n}</button>`
          )
          .join('')}
      </div>
    `

    modal.appendChild(box)
    document.body.appendChild(modal)

    box.querySelectorAll('button').forEach((btn) => {
      btn.onclick = () => {
        const val = parseInt(btn.getAttribute('data-val'))
        document.body.removeChild(modal)
        inModal = false
        onSubmit(val)
      }
    })
  }

  const showAITrustModal = (onSubmit) => {
    inModal = true
    const modal = document.createElement('div')
    modal.style.position = 'fixed'
    modal.style.top = '0'
    modal.style.left = '0'
    modal.style.width = '100vw'
    modal.style.height = '100vh'
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)'
    modal.style.display = 'flex'
    modal.style.justifyContent = 'center'
    modal.style.alignItems = 'center'
    modal.style.zIndex = '99999'

    const box = document.createElement('div')
    box.style.background = '#333'
    box.style.color = '#fff'
    box.style.padding = '20px 30px'
    box.style.borderRadius = '10px'
    box.style.textAlign = 'center'
    box.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'
    box.style.fontFamily = 'Arial, sans-serif'
    box.style.fontSize = '14px'
    box.style.minWidth = '400px'
    
    box.innerHTML = `
      <h3 style="margin-bottom: 12px;">Rate how this task affected your confidence in AI assistance</h3>
      <div id="trust-buttons" style="display: flex; flex-direction: column; gap: 8px;">
        <button style="padding: 10px 16px; border-radius: 6px; border: 1px solid #777; background: #555; color: #fff; cursor: pointer; font-weight: normal; text-align: left;" data-val="significantly_decreased">
          <strong>Significantly Decreased</strong>
        </button>
        <button style="padding: 10px 16px; border-radius: 6px; border: 1px solid #777; background: #555; color: #fff; cursor: pointer; font-weight: normal; text-align: left;" data-val="decreased">
          <strong>Decreased</strong>
        </button>
        <button style="padding: 10px 16px; border-radius: 6px; border: 1px solid #777; background: #555; color: #fff; cursor: pointer; font-weight: normal; text-align: left;" data-val="no_change">
          <strong>No Change</strong>
        </button>
        <button style="padding: 10px 16px; border-radius: 6px; border: 1px solid #777; background: #555; color: #fff; cursor: pointer; font-weight: normal; text-align: left;" data-val="increased">
          <strong>Increased</strong>
        </button>
        <button style="padding: 10px 16px; border-radius: 6px; border: 1px solid #777; background: #555; color: #fff; cursor: pointer; font-weight: normal; text-align: left;" data-val="significantly_increased">
          <strong>Significantly Increased</strong>
        </button>
      </div>
    `

    modal.appendChild(box)
    document.body.appendChild(modal)

    box.querySelectorAll('button').forEach((btn) => {
      btn.onmouseover = () => {
        btn.style.background = '#666'
      }
      btn.onmouseout = () => {
        btn.style.background = '#555'
      }
      btn.onclick = () => {
        const val = btn.getAttribute('data-val')
        document.body.removeChild(modal)
        inModal = false
        onSubmit(val)
      }
    })
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(allLogs, null, 2)], {
      type: 'application/json'
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `annotation_log_${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(a.href)

    localStorage.removeItem('logger_state')
    tasks = []
    allLogs = []
    currentTaskIndex = 0
    currentLog = []
    annotationCount = 0
    editCount = 0
    deleteCount = 0
    taskStartTime = null
    loggingActive = false

    if (timeCheckInterval) {
      clearInterval(timeCheckInterval)
      timeCheckInterval = null
    }

    const panel = document.getElementById('logger-panel')
    if (panel) {
      document.body.removeChild(panel)
      createLoggerUI()
    }
  }

  document.addEventListener('click', (e) => {
    if (!loggingActive || inModal) return
    const info = {
      type: 'click',
      time: new Date().toISOString(),
      x: e.pageX,
      y: e.pageY,
      element: e.target.tagName,
      id: e.target.id || 'no-id',
      class: e.target.className || 'no-class'
    }
    currentLog.push(info)
    persistState()
  })

  document.addEventListener('keydown', (e) => {
    if (!loggingActive || inModal) return
    const info = {
      type: 'keydown',
      time: new Date().toISOString(),
      key: e.key
    }
    currentLog.push(info)
    persistState()
  })

  let mouseStopTimeout = null
  let lastMousePos = null
  document.addEventListener('mousemove', (e) => {
    if (!loggingActive || inModal) return

    const x = e.pageX
    const y = e.pageY

    clearTimeout(mouseStopTimeout)
    mouseStopTimeout = setTimeout(() => {
      if (lastMousePos && lastMousePos.x === x && lastMousePos.y === y) return

      lastMousePos = { x, y }
      const info = {
        type: 'mouse_stop',
        time: new Date().toISOString(),
        x,
        y,
        url: window.location.href
      }
      currentLog.push(info)
      persistState()
    }, 500)
  })

  window.logAnnotationCreated = (annotationId, classId) => {
    if (!loggingActive) return
    annotationCount++
    const info = {
      type: 'annotation_created',
      time: new Date().toISOString(),
      id: annotationId,
      classId: classId || 'no-class'
    }
    currentLog.push(info)
    persistState()

    const currentTask = tasks[currentTaskIndex]
    if (annotationCount >= currentTask.targetAnnotations) {
      completeTask('completed')
    }
  }

  window.logAnnotationEdited = (annotationId, classId) => {
    if (!loggingActive) return
    editCount++
    const info = {
      type: 'annotation_edited',
      time: new Date().toISOString(),
      id: annotationId,
      classId: classId || 'no-class'
    }
    currentLog.push(info)
    persistState()
  }

  window.logAnnotationDeleted = (annotationId, classId) => {
    if (!loggingActive) return
    deleteCount++
    if (annotationCount > 0) {
      annotationCount--
    }
    const info = {
      type: 'annotation_deleted',
      time: new Date().toISOString(),
      id: annotationId,
      classId: classId || 'no-class'
    }
    currentLog.push(info)
    persistState()
  }

  loadState()

  const initializeUI = () => {
    createLoggerUI()

    if (tasks.length > 0) {
      const loadSection = document.getElementById('load-section')
      const taskSection = document.getElementById('task-section')
      if (loadSection && taskSection) {
        loadSection.style.display = 'none'
        taskSection.style.display = 'block'
        updatePanel()

        if (loggingActive) {
          timeCheckInterval = setInterval(() => {
            if (!loggingActive) {
              clearInterval(timeCheckInterval)
              return
            }
            const elapsed = (new Date() - taskStartTime) / 1000
            const currentTask = tasks[currentTaskIndex]
            if (elapsed >= currentTask.maxTime) {
              clearInterval(timeCheckInterval)
              completeTask('timeout')
            }
          }, 1000)
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUI)
  } else {
    initializeUI()
  }

  window.addEventListener('load', () => {
    if (!document.getElementById('logger-panel')) {
      initializeUI()
    }
  })
})()