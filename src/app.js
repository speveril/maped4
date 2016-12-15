import { Map, verifyTileData, verifyMap } from './Map.js';
import { Tools, clickEyedropper, clickDrawBrush } from './Tools.js';
import { Palettes } from './Palettes.js';
import { LayersWidget, selectZoneLayer, selectObstructionLayer, selectNumberedLayer } from './js/ui/LayersPalette.js';
import { ZonesWidget } from './js/ui/ZonesPalette.js';
import { EntitiesWidget } from './js/ui/EntityPalette.js';
import { TilesetSelectorWidget } from './js/ui/TilesetSelectorPalette.js';
import { handleUndo, handleRedo } from './UndoRedo';
import { ipcRenderer } from 'electron';
import { toggleSelectedTiles } from './TileSelector';

const sprintf = require('sprintf-js').sprintf;
const path = require('path');
const $ = require('jquery');

const initInfoWidget = (map) => {
  $('#info-mapname').attr('src', map.mapPath);

  const pathParts = map.mapPath.split(path.sep);
  $('#info-mapname').text(pathParts[pathParts.length - 1]);

  $('#info-dims').text(map.mapSizeInTiles[0] + 'x' + map.mapSizeInTiles[1]);
};

const bootstrapMap = (mapFile, tiledataFile) => {
  verifyTileData(tiledataFile)
    .then(() => {
      console.log('verify map?');
      verifyMap(mapFile)
        .then(() => {
          console.log('create map?');
          new Map(
              mapFile, tiledataFile,
              Tools.updateLocationFunction
          ).ready()
              .then(function (m) {
                const currentMap = m;
                m.setCanvas($('.map_canvas'));

                window.$$$currentMap = currentMap;

                LayersWidget.initLayersWidget(currentMap);
                initInfoWidget(currentMap);
                ZonesWidget.initZonesWidget(currentMap);
                EntitiesWidget.initEntitiesWidget(currentMap);

                Tools.initToolsToMapContainer($('.map_canvas'), window.$$$currentMap);

                Tools.updateRstringInfo();
              });
        });
    });
};

// Setup IPC
ipcRenderer.on('main-menu', (event, arg) => {
  if (typeof arg.accelerator === 'string') {
    const el = document.activeElement;
    if (el.type && el.type === 'text') {
      console.info('in a textfield, ignoring the accelerator');
      return;
    }
    // console.log(document.activeElement);
    // var el = document.activeElement;
    // debugger;
  }

  switch (arg.msg) {
    case 'save':
      window.$$$save();
      break;
    case 'save-as':
      window.$$$saveAs();
      break;
    case 'load':
      window.$$$load();
      break;
    case 'undo':
      handleUndo();
      break;
    case 'redo':
      handleRedo();
      break;
    case 'tile-swap':
      // TODO don't do this if you're in a text-editing field
      toggleSelectedTiles(window.$$$currentMap);
      break;
    case 'tool-brush':
      clickDrawBrush();
      break;
    case 'tool-eyedropper':
      clickEyedropper();
      break;
    case 'about':
      window.$$$about_breaditor();
      break;
    case 'focus-layer-O':
      selectObstructionLayer();
      break;
    case 'focus-layer-Z':
      selectZoneLayer();
      break;
    case 'focus-layer-E':
      // TODO implement the entities layer already.
      console.log('TODO implement the entities layer already.');
      break;
    case 'focus-layer-1':
    case 'focus-layer-2':
    case 'focus-layer-3':
    case 'focus-layer-4':
    case 'focus-layer-5':
    case 'focus-layer-6':
    case 'focus-layer-7':
    case 'focus-layer-8':
    case 'focus-layer-9':
      const argParsed = arg.split('-');
      selectNumberedLayer(parseInt(argParsed[argParsed.length - 1]));
      break;
    case 'map':
    case 'tool':
    case 'info':
    case 'layers':
    case 'zones':
    case 'entity':
    case 'tileset-selector':
      window.$$$toggle_pallete(arg);
      break;
    case 'all-collect':
      window.$$$collect_all_windows();
      break;
    case 'all-show':
      window.$$$show_all_windows();
      break;

    default:
      console.error(sprintf("Unknown action from main-menu: '%s'.", arg));
  }
});

// Setup the rest of the app
(() => {
  window.$$$currentMap = null;

  const tick = function (timestamp) {
    if (window.$$$currentMap) {
      window.$$$currentMap.render();
      TilesetSelectorWidget.renderTilesetSelectorWidget();
    }

    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);

  $('#btn-tool-undo').click(() => {
    handleUndo();
  });
  $('#btn-tool-redo').click(() => {
    handleRedo();
  });

  console.log('$$$save should be initialized...');
  window.$$$save = function (newName) {
    const app = require('electron').remote.app;
    const jetpack = require('fs-jetpack').cwd(app.getAppPath());

    const map = window.$$$currentMap;
    map.compactifyZones(); // TODO this should probably happen not-here?

    let mapfile = map.filenames.mapfile;
    let datafile = map.filenames.mapdatafile;
    if (typeof newName !== 'undefined') {
      mapfile = newName;
      datafile = mapfile.replace('.map.json', '.map.data.json'); // todo this is shit.
    }

    console.info('saving', mapfile);
    console.info('saving', datafile);

    jetpack.write(mapfile, map.mapData);
    jetpack.write(datafile, map.mapRawTileData);

    console.log('HELLO I AM $$$SAVE');
  };

  const loadByFilename = (fileNames) => {
    if (fileNames === undefined) {
      return;
    }

    const fileName = fileNames[0];

    const dataName = fileName.replace('.map.json', '.map.data.json');
    // const vspName = fileName.replace('.map.json', '.vsp.json');

    // TODO: verify that all three of these files, you know... exist?
    bootstrapMap(fileName, dataName);
  };

  window.$$$about_breaditor = function () {
    window.alert(
      'Breaditor is a pile of junk made mostly by @bengrue and a little by Shamus Peveril.' +
      'TODO: make this better.'
    );
  };

  window.$$$collect_all_windows = function () {
    let x = 0;
    let y = 0;
    let z = 0;

    window.$$$palette_registry.map((pal) => {
      const node_selector = '.' + pal;
      const $node = $(node_selector);
      $node.css('top', y + 'px');
      $node.css('left', x + 'px');
      $node.css('z-index', z);

      Palettes.correctResizeWidget($node);

      x += 30;
      y += 30;
      z += 2;
    });

    Tools.savePalettePositions();
  };

  window.$$$show_all_windows = function () {
    window.$$$palette_registry.map((pal) => {
      const node_selector = '.' + pal;
      const $node = $(node_selector);
      $node.show();
    });

    Tools.savePalettePositions();
  };

  window.$$$load = function () {
    const { dialog } = require('electron').remote;

    dialog.showOpenDialog(
      {filters: [{ name: 'text', extensions: ['map.json'] }]},
      loadByFilename
    );
  };

  window.$$$saveAs = function () {
    const { dialog } = require('electron').remote;

    dialog.showSaveDialog(
      {filters: [{ name: 'text', extensions: ['map.json'] }]},
      (filename) => {
        if (filename) {
          window.$$$save(filename);
        }
      }
    );
  };

  window.$$$palette_registry = [
    'map-palette',
    'tool-palette',
    'layers-palette',
    'zones-palette',
    'entity-palette',
    'info-palette',
    'tileset-selector-palette'
  ];

  window.$$$toggle_pallete = function (pal) {
    let node_selector = '';
    let node = pal + '-palette';

    if (window.$$$palette_registry.indexOf(node) >= 0) {
      node_selector = '.' + node;
      node = $(node_selector);

      if (!node.length) {
        throw new Error("Invalid palette node selector: '" + node_selector + "'");
      }
    } else {
      throw new Error("Invalid palette name: '" + pal + "'");
    }

    if (node.is(':visible')) {
      node.hide();
    } else {
      node.show();
    }

    Tools.savePalettePositions();
  };

  Palettes.setupPaletteListeners();

  window.appPath = path.dirname(require.main.filename);
  window.$$$load();

    // loadByFilename(['../app/map_assets/farmsville.map.json']);

    /*
    /// INITIAL LOAD
    /// TODO: special case this with a null map for new-saving?
    bootstrapMap(
    	'../app/map_assets/farmsville.map.json',
        '../app/map_assets/farmsville.map.data.json',
        {
			'default':      '../app/map_assets/farmsville.vsp.json',
			'obstructions': '../app/map_assets/farmsville.obsvsp.json'
	    }
    );
    */
})();

