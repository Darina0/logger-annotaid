# Logger

Hi and welcome to the **Logger** the **AnnotAid** version 👋

The logger is an automated data collection tool to help you during the UX testing sessions. It is created as a **plug-in**, however for the AnnotAid there are few modifications you need to do.

It is part of a Master's Thesis at FIIT STU 👩‍🎓

If you have any questions, don't hesitate to contact me via:
- **Teams**: Darina Dvorecká
- **Discord**: dada25

If you use this logger, please send me your exported ``.json`` files for my further research ✨

**Thank you for the contribution 🫶**

---

## 🛠️ How to Install

Include the `logger.js` script in AnnotAid it is a bit complicated than including it into a HTML prototype.

Firstly, you need to create a new folder for the logger, where you put the `logger.js` script. For example you can create a folder named `utils`.

```md
├── src/
│   ├── renderer/             # Electron renderer process
│   │   ├── src/
│   │   │   ├── utils/
│   │   │   │   ├── logger.js            
```

Now you need to add a following code snippet into a `main.tsx` file

```md
├── src/
│   ├── renderer/          # Electron renderer process
│   │   ├── src/
│   │   │   ├── main.tsx           
```

This part is for the including logger into render:
```tsx
//after these imports add the logger snippet
import '@renderer/i18n/config'
import '@renderer/dayjs/config'

//import the logger into AnnotAid
import "./utils/logger";
```

The last code snippets you will add into a code is into a file `useViewer.ts`

```md
├── src/
│   ├── renderer/             # Electron renderer process
│   │   ├── src/
│   │   │   ├── hooks/
│   │   │   │   ├── useViewer.ts            
```

Firstly, add this part to the top of the code before the import
```ts
// added for js logger
declare global {
  interface Window {
    logAnnotationCreated?: (annotationId: string, classId?: string) => void
    logAnnotationEdited?: (annotationId: string, classId?: string) => void
    logAnnotationDeleted?: (annotationId: string, classId?: string) => void
  }
}

import { useCallback, useEffect } from 'react'
```

Now you need to add a snippets of code to each annotation created, edited and deleted functions.

**Annotation cration**
In the code look for this comment `// Log annotation creation`. Then add there this snippet:

```ts
// Log annotation creation - this part of code alredy is in the script
const currentActiveTool = getActiveTool()
await logAnnotationCreated(
    savedAnnotation.id,
    imageId || undefined,
    currentActiveTool?.value
)

// added for js logger
if (typeof window.logAnnotationCreated === 'function') {
    const classId = savedAnnotation.body?.find(b => b.purpose === 'tagging')?.value
    window.logAnnotationCreated(savedAnnotation.id, classId)
}
```

**Annotation edit**
In the code look for this comment `// Log annotation edit`. Then add there this snippet:
```ts
// Log annotation edit - this part of code alredy is in the script
const currentActiveTool = getActiveTool()
await logAnnotationEdited(
    annotation.id,
    imageId || undefined,
    currentActiveTool?.value
)

// added for js logger
if (typeof window.logAnnotationEdited === 'function') {
    const classId = annotation.body?.find(b => b.purpose === 'tagging')?.value
    window.logAnnotationEdited(annotation.id, classId)
}
```

**Annotation deletion**
In the code look for this comment `// Log annotation deletion`. Then add there this snippet:

```ts
// Log annotation deletion
const currentActiveTool = getActiveTool()
await logAnnotationDeleted(
    annotation.id,
    imageId || undefined,
    currentActiveTool?.value
)

// added for js logger
if (typeof window.logAnnotationDeleted === 'function') {
    const classId = annotation.body?.find(b => b.purpose === 'tagging')?.value
    window.logAnnotationDeleted(annotation.id, classId)
}
```

---

## 📁 Task Configuration

The logger is designed to be **task-based** and automatically switch between tasks. So before you start with your UX testing session, you need to prepare and create a task configuration file in ``.json`` format.

Here is an example of a configuration file (or go to see the `tasks_example.json`):

```json
[
  {
    "description": "Motivational US0",
    "type": "M",
    "targetAnnotations": 7,
    "maxTime": 60
  },
  {
    "description": "US1 - R",
    "type": "M",
    "targetAnnotations": 9,
    "maxTime": 150
  },
  {
    "description": "US1 - A",
    "type": "A",
    "targetAnnotations": 10,
    "maxTime": 180
  },
  {
    "description": "US2 - A",
    "type": "A",
    "targetAnnotations": 10,
    "maxTime": 180
  }
]
```

To configure your tasks, upload your ``.json`` file using the **Load Tasks** button in the logger panel.

---

## 📝 Supported Task Types

This version of the logger supports two main types of tasks:
- **M** - manual tasks where participants annotate manually (no AI-assisted task via Wizard of Oz)
- **A** - AI-assisted tasks with the Wizard of Oz simulation 

If you need specific type of task or just need to update the logic of the logger, just contact me.

### M - manual 

Use this type when the participant must **manually** annotate the image.

**Required fields**:

| Field | Description |
|-------|-------------|
| description | Task description |
| type | `"M"` |
| targetAnnotations | Number of annotations wanted to automatically finish task |
| maxTime | Time limit in seconds |

After completing the task, the participant will:
- rate task difficulty (1–7)

### A - AI-assisted

Use this type for **Wizard of Oz** tasks.

Required fields:

| Field | Description |
|-------|-------------|
| description | Task description |
| type | `"A"` |
| targetAnnotations | Just for the automatization, but the participant can manually finish the task via *Finish* button |
| maxTime | Time limit in seconds |

After completing the task, the participant will:
- rate task difficulty (1–7)
- rate the change in his trust in AI

--- 

## ⏱️ Timeout Handling

Each task has a defined time limit (`maxTime`).

If exceeded:

- the task ends and the task difficulty modal will appear
- it is marked as **not completed in time**

---

## 📤 Export

After completing all tasks, click **Export** to download:

```
annotation_log_TIMESTAMP.json
```

---

## 💾 Persistence

Logger state is stored in ``localStorage``

This allows:
- session recovery after refresh
- persistence across page transitions
- uninterrupted task tracking

State is automatically cleared after exporting results.

---

## ⚠️ Notes

- Logging only occurs when a task is active
- Logging pauses during modals
- Invalid task files will be rejected
- Tasks can be skipped before starting the task