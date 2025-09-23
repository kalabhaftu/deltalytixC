/**
 * DOM patches to handle common issues with third-party widgets
 * These patches help prevent React DOM manipulation errors
 */

// Patch to handle removeChild errors gracefully
export function patchRemoveChild() {
  if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
    const originalRemoveChild = Node.prototype.removeChild
    
    Node.prototype.removeChild = function<T extends Node>(child: T): T {
      try {
        if (child.parentNode !== this) {
          console.warn('DOM Warning: Attempted to remove a child from a different parent', {
            child,
            expectedParent: this,
            actualParent: child.parentNode
          })
          return child
        }
        return originalRemoveChild.call(this, child) as T
      } catch (error) {
        console.warn('DOM Warning: Error removing child node', error)
        return child
      }
    }
  }
}

// Patch to handle insertBefore errors gracefully
export function patchInsertBefore() {
  if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
    const originalInsertBefore = Node.prototype.insertBefore
    
    Node.prototype.insertBefore = function<T extends Node>(node: T, child: Node | null): T {
      try {
        return originalInsertBefore.call(this, node, child) as T
      } catch (error) {
        console.warn('DOM Warning: Error inserting node', error)
        this.appendChild(node)
        return node
      }
    }
  }
}

// Initialize all DOM patches
export function initializeDOMPatches() {
  patchRemoveChild()
  patchInsertBefore()
}

export default initializeDOMPatches
