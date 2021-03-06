declare var require: (s: string) => any;
import { Folder, Item, sp } from "@pnp/sp";
import { SPFetchClient } from "@pnp/nodejs";
import { readFile } from 'fs';
var yargs = require('yargs');
const settings = require("../config/settings.js");
let usuario = yargs.argv.usuario || 'main';
console.log('Efetuando deploy para: ' + usuario);

sp.setup({
    sp: {
        fetchClientFactory: () => {
            return new SPFetchClient(settings.sp.url, settings.sp.id, settings.sp.secret);
        }
    }
});

(async () => {
    let deployFolderItem = await sp.web.getFolderByServerRelativePath('/sites/DEV_LotePiloto/SiteAssets/deploy').getItem();
    let folder: Folder;

    try {
        let usuarioFolderItem = await deployFolderItem.folder.folders.getByName(usuario).getItem();
        folder = usuarioFolderItem.folder;
    } catch (e) {
        let result = await deployFolderItem.folder.folders.add(usuario);
        folder = result.folder;
    }

    let jsFolder: Folder;

    try {
        let jsFolderItem = await folder.folders.getByName('JS').getItem();
        jsFolder = jsFolderItem.folder;
    } catch (e) {
        let result = await folder.folders.add('JS');
        jsFolder = result.folder;
    }

    readFile('dist/natura.html', function (err, contents) {
        folder.files.add('natura.html', contents, true);
    });

    readFile('dist/agendamentos.html', function (err, contents) {
        folder.files.add('agendamentos.html', contents, true);
    });

    readFile('dist/lotePiloto.js', function (err, contents) {
        jsFolder.files.add('lotePiloto.js', contents, true);
    });
    readFile('dist/agendamentos.js', function (err, contents) {
        jsFolder.files.add('agendamentos.js', contents, true);
    });
})();