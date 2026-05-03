// Polyfill for Node 18: globalThis.File (добавлен в Node 20)
if (typeof File === 'undefined') {
  globalThis.File = class {
    constructor(bits, name, options) {}
  };
}