ChromeUtils.defineModuleGetter(this, "ExtensionCommon",
                               "resource://gre/modules/ExtensionCommon.jsm");

let tm = Cc["@mozilla.org/thread-manager;1"].getService();
let socketService = Cc["@mozilla.org/network/socket-transport-service;1"]
                      .getService(Ci.nsISocketTransportService);

let gManager = {
  serverSocketMap: new Map(),
  sendingSocketMap: new Map(),
  socketCount: 0,
  dataListeners: new Set(),
};

this.sockets = class extends ExtensionAPI {
  getAPI(context) {
    return {
      sockets: {
        async createServerSocket() {
          let serverSocket = Cc["@mozilla.org/network/server-socket;1"]
                               .createInstance(Ci.nsIServerSocket);
          serverSocket.init(-1, true, -1); // init with random port
          gManager.socketCount++;
          gManager.serverSocketMap.set(serverSocket.port, serverSocket);
          return serverSocket.port;
        },

        startListening(id) {
          if (!gManager.serverSocketMap.has(id)) {
            return;
          }
          let socket = gManager.serverSocketMap.get(id);
          socket.asyncListen({
            onSocketAccepted: (sock, transport) => {
              let inputStream = transport.openInputStream(0, 0, 0);
              let socketListener = {
                onInputStreamReady: () => {
                  let count;
                  try {
                    count = inputStream.available();
                  } catch (e) {
                    // probably closed.
                    return;
                  }
                  let bis = Cc["@mozilla.org/binaryinputstream;1"]
                              .createInstance(Ci.nsIBinaryInputStream);
                  bis.setInputStream(inputStream);
                  let data = bis.readBytes(count);
                  gManager.dataListeners.forEach((listener) => {
                    listener(id, data);
                  });
                  inputStream.asyncWait(socketListener, 0, 0, tm.mainThread);
                }
              };
              inputStream.asyncWait(socketListener, 0, 0, tm.mainThread);
            }
          });
        },

        onDataReceived: new ExtensionCommon.EventManager(
          context,
          "sockets.onDataReceived",
          (fire) => {
            let listener = (id, data) => {
              fire.async(id, data);
            };

            gManager.dataListeners.add(listener);
            return () => {
              gManager.dataListeners.delete(listener);
            };
          }
        ).api(),

        async createSendingSocket() {
          gManager.socketCount++;
          gManager.sendingSocketMap.set(gManager.socketCount, {
            stream: null,
            bOutputStream: Cc["@mozilla.org/binaryoutputstream;1"]
                             .createInstance(Ci.nsIBinaryOutputStream),
          });
          return gManager.socketCount;
        },

        connect(id, host, port) {
          if (!gManager.sendingSocketMap.has(id)) {
            return;
          }
          try {
            let socket = gManager.sendingSocketMap.get(id);
            var transport = socketService.createTransport(null, 0, host, port, null);
            socket.stream = transport.openOutputStream(1, 4096, 1048575);
            socket.bOutputStream.setOutputStream(socket.stream);
            return true;
          } catch (err) {
            console.error(err,err.message);
            return false;
          }
        },

        sendData(id, data) {
          if (!gManager.sendingSocketMap.has(id)) {
            return;
          }
          let socket = gManager.sendingSocketMap.get(id);
          try {
            socket.stream.write(data, data.length);
            return true;
          } catch (err) {
            console.error(err,err.message);
            return false;
          }
        },

        close(id) {
          if (!gManager.sendingSocketMap.has(id)) {
            return;
          }
          gManager.sendingSocketMap.get(id).stream.close();
        },
      },
    };
  }
};
