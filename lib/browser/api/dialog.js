'use strict'

const {app, BrowserWindow, ipcMain} = require('electron')
const binding = process.atomBinding('dialog')
const v8Util = process.atomBinding('v8_util')

const includes = [].includes

const fileDialogProperties = {
  openFile: 1 << 0,
  openDirectory: 1 << 1,
  multiSelections: 1 << 2,
  createDirectory: 1 << 3,
  showHiddenFiles: 1 << 4
}

const messageBoxTypes = ['none', 'info', 'warning', 'error', 'question']

const messageBoxOptions = {
  noLink: 1 << 0
}

const parseArgs = function (window, options, callback, ...args) {
  if (window !== null && window.constructor !== BrowserWindow) {
    // Shift.
    [callback, options, window] = [options, window, null]
  }

  if ((callback == null) && typeof options === 'function') {
    // Shift.
    [callback, options] = [options, null]
  }

  // Fallback to using very last argument as the callback function
  const lastArgument = args[args.length - 1]
  if ((callback == null) && typeof lastArgument === 'function') {
    callback = lastArgument
  }

  return [window, options, callback]
}

const checkAppInitialized = function () {
  if (!app.isReady()) {
    throw new Error('dialog module can only be used after app is ready')
  }
}

const showOpenDialog = function (...args) {
  checkAppInitialized()

  let [window, options, callback] = parseArgs(...args)

  if (options == null) {
    options = {
      title: 'Open',
      properties: ['openFile']
    }
  }

  if (options.properties == null) {
    options.properties = ['openFile']
  }

  if (!Array.isArray(options.properties)) {
    throw new TypeError('Properties must be an array')
  }

  let properties = 0
  for (const prop in fileDialogProperties) {
    const value = fileDialogProperties[prop]
    if (includes.call(options.properties, prop)) {
      properties |= value
    }
  }

  if (options.title == null) {
    options.title = ''
  } else if (typeof options.title !== 'string') {
    throw new TypeError('Title must be a string')
  }

  if (options.buttonLabel == null) {
    options.buttonLabel = ''
  } else if (typeof options.buttonLabel !== 'string') {
    throw new TypeError('buttonLabel must be a string')
  }

  if (options.defaultPath == null) {
    options.defaultPath = ''
  } else if (typeof options.defaultPath !== 'string') {
    throw new TypeError('Default path must be a string')
  }

  if (options.filters == null) {
    options.filters = []
  }

  const wrappedCallback = typeof callback === 'function' ? function (success, result) {
    return callback(success ? result : void 0)
  } : null
  return binding.showOpenDialog(options.title, options.buttonLabel, options.defaultPath, options.filters, properties, window, wrappedCallback)
}

const showSaveDialog = function (...args) {
  checkAppInitialized()

  let [window, options, callback] = parseArgs(...args)

  if (options == null) {
    options = {
      title: 'Save'
    }
  }
  if (options.title == null) {
    options.title = ''
  } else if (typeof options.title !== 'string') {
    throw new TypeError('Title must be a string')
  }
  if (options.buttonLabel == null) {
    options.buttonLabel = ''
  } else if (typeof options.buttonLabel !== 'string') {
    throw new TypeError('buttonLabel must be a string')
  }
  if (options.defaultPath == null) {
    options.defaultPath = ''
  } else if (typeof options.defaultPath !== 'string') {
    throw new TypeError('Default path must be a string')
  }
  if (options.filters == null) {
    options.filters = []
  }

  const wrappedCallback = typeof callback === 'function' ? function (success, result) {
    return callback(success ? result : void 0)
  } : null
  return binding.showSaveDialog(options.title, options.buttonLabel, options.defaultPath, options.filters, window, wrappedCallback)
}

const showMessageBox = function (...args) {
  checkAppInitialized()

  let [window, options, callback] = parseArgs(...args)

  if (options == null) {
    options = {type: 'none'}
  }
  if (options.type == null) {
    options.type = 'none'
  }

  const messageBoxType = messageBoxTypes.indexOf(options.type)
  if (messageBoxType === -1) {
    throw new TypeError('Invalid message box type')
  }

  if (!Array.isArray(options.buttons)) {
    throw new TypeError('Buttons must be an array')
  }

  if (options.title == null) {
    options.title = ''
  } else if (typeof options.title !== 'string') {
    throw new TypeError('Title must be a string')
  }

  if (options.message == null) {
    options.message = ''
  } else if (typeof options.message !== 'string') {
    throw new TypeError('Message must be a string')
  }

  if (options.detail == null) {
    options.detail = ''
  } else if (typeof options.detail !== 'string') {
    throw new TypeError('Detail must be a string')
  }

  if (options.icon == null) {
    options.icon = null
  }

  if (options.defaultId == null) {
    options.defaultId = -1
  }

  // Choose a default button to get selected when dialog is cancelled.
  if (options.cancelId == null) {
    options.cancelId = 0
    for (let text of options.buttons) {
      text = text.toLowerCase()
      if (text === 'cancel' || text === 'no') {
        options.cancelId = i
        break
      }
    }
  }

  const flags = options.noLink ? messageBoxOptions.noLink : 0
  return binding.showMessageBox(messageBoxType, options.buttons, options.defaultId, options.cancelId, flags, options.title, options.message, options.detail, options.icon, window, callback)
}

const showErrorBox = function (...args) {
  return binding.showErrorBox.apply(binding, args)
}

module.exports = {
  showOpenDialog: showOpenDialog,
  showSaveDialog: showSaveDialog,
  showMessageBox: showMessageBox,
  showErrorBox: showErrorBox
}

// Mark standard asynchronous functions.
for (const api of ['showMessageBox', 'showOpenDialog', 'showSaveDialog']) {
  v8Util.setHiddenValue(module.exports[api], 'asynchronous', true)
}

// Implements window.alert(message, title)
ipcMain.on('ELECTRON_DIALOG_WINDOW_ALERT', function (event, message, title) {
  if (message == null) message = ''
  if (title == null) title = ''

  event.returnValue = showMessageBox(event.sender.getOwnerBrowserWindow(), {
    message: String(message),
    title: String(title),
    buttons: ['OK']
  })
})

// Implements window.confirm(message, title)
ipcMain.on('ELECTRON_DIALOG_WINDOW_CONFIRM', function (event, message, title) {
  if (message == null) message = ''
  if (title == null) title = ''

  event.returnValue = !showMessageBox(event.sender.getOwnerBrowserWindow(), {
    message: String(message),
    title: String(title),
    buttons: ['OK', 'Cancel'],
    cancelId: 1
  })
})
