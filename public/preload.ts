const {contextBridge, ipcRenderer} = require("electron");
const crypto = require('crypto');
const path = require("path");
const fs = require("fs");


// Populate bridge for renderer
contextBridge.exposeInMainWorld('electron', {
    fs,
    debug: `${process.platform} ${process.arch}`,
    saveDialogSync(data: string, filename?: string) {
        return ipcRenderer.invoke('dialog:showSaveDialogSync', data, filename);
    },
    openDialogSync(properties: string[] = []) {
        return ipcRenderer.invoke('dialog:showOpenDialogSync', properties);
    },
    getPath(name: string) {
        return ipcRenderer.invoke('app:getPath', name);
    },
    crypto: {
        constants: crypto.constants,
        createPublicKey(key: Object | string | ArrayBuffer | Buffer | DataView) {
            const publicKey = crypto.createPublicKey(key);
            return publicKey.export({type: 'spki', format: 'der'});
        },
        createPrivateKey(key: Object | string | ArrayBuffer | Buffer | DataView) {
            const privateKey = crypto.createPrivateKey(key);
            return privateKey.export({type: 'pkcs1', format: 'der'});
        },
        publicEncrypt: crypto.publicEncrypt,
        privateDecrypt: crypto.privateDecrypt,
        generateRSAKeyPairSync(dest?: string): {public: number[]; secret: number[]} {
            const {publicKey, privateKey} = crypto.generateKeyPairSync('rsa', {
                modulusLength: 512
            });

            if (dest) {
                fs.writeFileSync(
                    path.join(dest, 'rsa.public.pem'),
                    publicKey.export({type: 'spki', format: 'pem'})
                );
                fs.writeFileSync(
                    path.join(dest, 'rsa.secret.pem'),
                    privateKey.export({type: 'pkcs1', format: 'pem'})
                );
            }

            return {
                public: publicKey.export({type: 'spki', format: 'der'}),
                secret: privateKey.export({type: 'pkcs1', format: 'der'})
            };
        }
    },
    everscale(method: string, params?: any) {
        const args = `--function ${method} --params ${JSON.stringify(JSON.stringify(params ?? {}))}`
        return ipcRenderer.invoke('everscale', args);
    },
    zkp: {
        async setup(dest: string) {
            await ipcRenderer.invoke('zkp', dest, '--setup --ballot_number 1');
        },
        async proof(dest: string, voter: number) {
            await ipcRenderer.invoke('zkp', dest, `--proof --ballot_number ${voter}`);
            return fs.readFileSync(path.join(dest, 'proof'));
        }
    }
});

export {}
