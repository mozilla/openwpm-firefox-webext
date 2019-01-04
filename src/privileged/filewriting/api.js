ChromeUtils.defineModuleGetter(this, "ExtensionCommon",
                               "resource://gre/modules/ExtensionCommon.jsm");
ChromeUtils.defineModuleGetter(this, "OS", "resource://gre/modules/osfile.jsm");
XPCOMUtils.defineLazyGlobalGetters(this, ["TextEncoder"]);

this.filewriting = class extends ExtensionAPI {
  getAPI(context) {
    return {
      filewriting: {
        async writeFile(filename, data) {
          let encoder = new TextEncoder();
          let array = encoder.encode(data);
          let path = OS.Path.join(OS.Constants.Path.profileDir, filename);
          let tmpPath = OS.Path.join(OS.Constants.Path.profileDir, filename + ".tmp");
          try {
            await OS.File.writeAtomic(path, array, {tmpPath});
            console.log(`Wrote to ${path}`);
            return true;
          } catch (e) {
            Cu.reportError(e);
            return false;
          }
        },
      },
    };
  }
};
