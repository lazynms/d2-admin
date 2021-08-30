import { useConfig } from 'd2-projects/d2-config/index.js'
import { $ } from 'd2-projects/d2-utils/vue.js'
import { isServer } from './is-server.js'
import { eventCode } from './aria.js'
import { addClass, removeClass, on } from './dom.js'

const onTouchMove = e => {
  e.preventDefault()
  e.stopPropagation()
}

const onModalClick = () => {
  OverlayManager?.doOnModalClick()
}

let hasModal = false
let zIndex

function getModal() {
  if (isServer) return
  let modalDom = OverlayManager.modalDom
  if (modalDom) {
    hasModal = true
  } else {
    hasModal = false
    modalDom = document.createElement('div')
    OverlayManager.modalDom = modalDom

    on(modalDom, 'touchmove', onTouchMove)
    on(modalDom, 'click', onModalClick)
  }

  return modalDom
}

const instances = {}

export const OverlayManager = {
  modalFade: true,
  modalDom: undefined,
  zIndex,

  getInstance: function (id) {
    return instances[id]
  },

  register: function (id, instance) {
    if (id && instance) {
      instances[id] = instance
    }
  },

  deregister: function (id) {
    if (id) {
      instances[id] = null
      delete instances[id]
    }
  },

  nextZIndex: function () {
    return ++ OverlayManager.zIndex
  },

  modalStack: [],

  doOnModalClick: function () {
    const topItem = OverlayManager.modalStack[OverlayManager.modalStack.length - 1]
    if (!topItem) return

    const instance = OverlayManager.getInstance(topItem.id)
    if (instance && instance.closeOnClickModal.value) {
      instance.close()
    }
  },

  openModal: function (id, zIndex, dom, modalClass, modalFade) {
    if (isServer) return
    if (!id || zIndex === undefined) return
    this.modalFade = modalFade

    const modalStack = this.modalStack

    for (let i = 0, j = modalStack.length; i < j; i++) {
      const item = modalStack[i]
      if (item.id === id) {
        return
      }
    }

    const modalDom = getModal()

    addClass(modalDom, 'v-modal')
    if (this.modalFade && !hasModal) {
      addClass(modalDom, 'v-modal-enter')
    }
    if (modalClass) {
      const classArr = modalClass.trim().split(/\s+/)
      classArr.forEach(item => addClass(modalDom, item))
    }
    setTimeout(() => {
      removeClass(modalDom, 'v-modal-enter')
    }, 200)

    if (dom && dom.parentNode && dom.parentNode.nodeType !== 11) {
      dom.parentNode.appendChild(modalDom)
    } else {
      document.body.appendChild(modalDom)
    }

    if (zIndex) {
      modalDom.style.zIndex = String(zIndex)
    }
    modalDom.tabIndex = 0
    modalDom.style.display = ''

    this.modalStack.push({ id: id, zIndex: zIndex, modalClass: modalClass })
  },

  closeModal: function (id) {
    const modalStack = this.modalStack
    const modalDom = getModal()

    if (modalStack.length > 0) {
      const topItem = modalStack[modalStack.length - 1]
      if (topItem.id === id) {
        if (topItem.modalClass) {
          const classArr = topItem.modalClass.trim().split(/\s+/)
          classArr.forEach(item => removeClass(modalDom, item))
        }

        modalStack.pop()
        if (modalStack.length > 0) {
          modalDom.style.zIndex = modalStack[modalStack.length - 1].zIndex
        }
      } else {
        for (let i = modalStack.length - 1; i >= 0; i--) {
          if (modalStack[i].id === id) {
            modalStack.splice(i, 1)
            break
          }
        }
      }
    }

    if (modalStack.length === 0) {
      if (this.modalFade) {
        addClass(modalDom, 'v-modal-leave')
      }
      setTimeout(() => {
        if (modalStack.length === 0) {
          if (modalDom.parentNode) modalDom.parentNode.removeChild(modalDom)
          modalDom.style.display = 'none'
          // off(modalDom, 'touchmove', onTouchMove)
          // off(modalDom, 'click', onModalClick)
          OverlayManager.modalDom = undefined
        }
        removeClass(modalDom, 'v-modal-leave')
      }, 200)
    }
  },
}

Object.defineProperty(OverlayManager, 'zIndex', {
  configurable: true,
  get() {
    if (zIndex === undefined) {
      const configs = useConfig()
      zIndex = $(configs.zIndex) || 2000
    }
    return zIndex
  },
  set(value) {
    zIndex = value
  },
})

function getTopLay () {
  if (isServer) return
  if (OverlayManager.modalStack.length > 0) {
    const topLay = OverlayManager.modalStack[OverlayManager.modalStack.length - 1]
    if (!topLay) return
    const instance = OverlayManager.getInstance(topLay.id)
    return instance
  }
}

if (!isServer) {
  on(window, 'keydown', function (event) {
    if (event.code === eventCode.esc) {
      const topLay = getTopLay()
      if (topLay && topLay.closeOnPressEscape.value) {
        topLay.handleClose
          ? topLay.handleClose()
          : topLay.handleAction
            ? topLay.handleAction('cancel')
            : topLay.close()
      }
    }
  })
}
