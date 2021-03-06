import { updateRstringInfo } from '../../Tools.js';
import { modal_error } from './Util.js';
import { setZoneVisibility, getZoneVisibility, setZoneAlpha, getZoneAlpha } from './ZonesPalette.js';
import { setShowEntitiesForLayer, shouldShowEntitiesForLayer,
         setNormalEntityVisibility, getNormalEntityVisibility,
         setEntityLayersExpanded, getEntityLayersExpanded } from './EntityPalette.js';
import { TilesetSelectorWidget } from './TilesetSelectorPalette.js';
import { setTileSelectorUI, setDefaultObsTiles } from '../../TileSelector';
import { resize_layer, hexToRgba } from './Util.js';

const $ = require('jquery');

let list;

let _obsAlpha = 1;

// in leiu of types, for now...
const generate_layer = (name, alpha, new_dim_x, new_dim_y, offset_x, offset_y, par_x, par_y, vsp, borderColor_hex, borderColor, map_tileData_idx) => {
  return {
    name: name,
    alpha: alpha,
    dimensions: {
      X: new_dim_x,
      Y: new_dim_y
    },
    offset: {
      X: offset_x,
      Y: offset_y,
    },
    parallax: {
      X: parseFloat(par_x),
      Y: parseFloat(par_y)
    },
    vsp: vsp,
    borderColor_hex: borderColor_hex,
    borderColor: borderColor,
    map_tileData_idx: map_tileData_idx
  };
}

export const visibilityFix = () => {
  const $n = $('.layers-palette');

  if ($n.width() < 100) {
    $n.css('width', '330px'); // todo  minwidth/height this in the css
    $n.css('height', '330px');
  }
};

export const setObsVisibility = (val) => {
  window.$$$currentMap.mapData.MAPED_OBSLAYER_VISIBLE = val;
};

export const getObsVisibility = () => {
  return window.$$$currentMap.mapData.MAPED_OBSLAYER_VISIBLE;
};

export const setObsAlpha = (val) => {
  _obsAlpha = val;
};

export const getObsAlpha = () => {
  return _obsAlpha;
};

const new_layer_click = (evt) => {
  _layer_click(evt);
};

export const newLayerOnNewMap = (evt, onComplete) => {
  _layer_click(evt, null, onComplete);
};

export const selectNamedLayer = (name) => {
  const $list = $('.layer_name');
  for (let i = $list.length - 1; i >= 0; i--) {
    const $node = $($list[i]);
    if ($node.text().trim().startsWith(name)) {
      console.info(`Clicking named layer '${name}'..`);
      $node.closest('li').click();
      return true;
    }
  }

  console.warn(`No such named layer '${name}' found on this map.`);

  return false;
};

export const selectNumberedLayer = (rstringNum) => {
  const name = window.$$$currentMap.getLayerByRStringCode(rstringNum).name;

  if (!name) {
    console.warn('No such numbered layer', rstringNum, 'found on this map');
  } else {
    selectNamedLayer(name);
  }
};

export const MAGICAL_ENT_LAYER_ID = 997;
export const MAGICAL_OBS_LAYER_ID = 998;
export const MAGICAL_ZONE_LAYER_ID = 999;

export const isSpecialLayer = (layer) => {
  return layer.map_tileData_idx > 990;
}

export const isSpecialLayerEntity = (layer) => {
  return layer.map_tileData_idx === MAGICAL_ENT_LAYER_ID;
}

export const isSpecialLayerObs = (layer) => {
  return layer.map_tileData_idx === MAGICAL_OBS_LAYER_ID;
}

export const isSpecialLayerZone = (layer) => {
  return layer.map_tileData_idx === MAGICAL_ZONE_LAYER_ID;
}

let $zone_container = null;
export const selectZoneLayer = (wasHotkey) => {
  const selClass = 'selected';
  let wasZone = false;
  const prevLayer = getSelectedLayer();
  if( prevLayer && isSpecialLayerZone(prevLayer) ) {
    wasZone = true;
  }

  removeAllSelectedLayers(selClass);

  // TODO: this is disgusting, right?  right.
  changeSelectedLayer({
    map_tileData_idx: MAGICAL_ZONE_LAYER_ID,
    layer: window.$$$currentMap.zoneData,
    $container: $zone_container
  });

  $zone_container.addClass(selClass);

  if (!wasZone && !getZoneVisibility() || (wasZone && wasHotkey)) {
    $('li.layer.selected button.eyeball_button').click();
  }

  closeEditLayerDialog();
};

let $ent_container = null;
export const selectEntityLayer = (wasHotkey) => {
  const selClass = 'selected';
  let wasEnt = false;
  const prevLayer = getSelectedLayer();
  if( prevLayer && isSpecialLayerEntity(prevLayer) ) {
    wasEnt = true;
  }

  removeAllSelectedLayers(selClass);

  // TODO: this is disgusting, right?  right.
  changeSelectedLayer({
    map_tileData_idx: MAGICAL_ENT_LAYER_ID,
    layer: {
      name: 'Entity Layer (E)'
    },
    $container: $zone_container
  });

  $ent_container.addClass(selClass);

  if (!wasEnt && !getNormalEntityVisibility() || (wasEnt && wasHotkey)) {
    $('li.layer.selected button.eyeball_button').click();
  }

  closeEditLayerDialog();
};

export function doLayerSelect($layer_container, layer_idx, dialog, map, evt) {
  const selClass = 'selected';

  removeAllSelectedLayers(selClass);

  changeSelectedLayer({
    map_tileData_idx: layer_idx,
    layer: layers[layer_idx],
    $container: $layer_container
  });
  $layer_container.addClass(selClass);

  TilesetSelectorWidget.initTilesetSelectorWidget(map, layers[layer_idx], null);
  if (dialog) {
    _layer_click(evt, layer_idx);
  }
}

export const selectLayer = (name) => {
  switch (name) {
    case 'O':
      selectObstructionLayer();
      return;
    case 'E':
      selectEntityLayer();
      return;
    case 'Z':
      selectZoneLayer();
      return;
    default:
      selectNamedLayer(name);
  }
};

let __layerSelectCallback = null;
export function setLayerSelectCallback(fn) {
  console.info('setting layerSelectCallback...', fn);
  __layerSelectCallback = fn;
}

function getLayerSelectCallback() {
  return __layerSelectCallback;
}

let $obs_container = null;
export const selectObstructionLayer = (wasHotkey) => {
  const selClass = 'selected';

  let wasObs = false;
  const prevLayer = getSelectedLayer();
  if( prevLayer && isSpecialLayerObs(prevLayer) ) {
    wasObs = true;
  }

  removeAllSelectedLayers(selClass);

  // TODO this is the wrong place to do this
  window.$$$currentMap.obsLayerData.parallax = {
    X: 1,
    Y: 1
  };

  // TODO definitely wrong, especially when we start supporting multiple sized layers
  window.$$$currentMap.obsLayerData.dimensions = {
    X: window.$$$currentMap.mapSizeInTiles.width,
    Y: window.$$$currentMap.mapSizeInTiles.height
  }

  const newObs = !_selected_layer || _selected_layer.map_tileData_idx !== MAGICAL_OBS_LAYER_ID;
  
    // TODO: this is disgusting, right?  right.
  changeSelectedLayer({
    map_tileData_idx: MAGICAL_OBS_LAYER_ID,
    layer: window.$$$currentMap.obsLayerData, // TODO why isnt this an array? :o
    $container: $obs_container
  });

  TilesetSelectorWidget.initTilesetSelectorWidget(map, map.obsLayerData, window.$$$currentMap.legacyObsData, () => {
    $obs_container.addClass(selClass);
    closeEditLayerDialog();

    if( newObs ) {
      setDefaultObsTiles();
    }
  });

  if (!wasObs && !getObsVisibility() || (wasObs && wasHotkey)) {
    $('li.layer.selected button.eyeball_button').click();
  }
};

let layers = null;
let map = null;
function initLayersWidget(_map) {
  map = _map;
  layers = map.mapData.layers;
  redraw_palette(map);
};

let _selected_layer = null;
export const changeSelectedLayer = (newLayer) => {
  _selected_layer = newLayer;

  // TODO in a codebase filled with shame, this is the most shameful. SHAAAAME.
  if (!_selected_layer.layer.parallax) {
    _selected_layer.layer.parallax = {
      X: 1,
      Y: 1
    };
  }
  if (!_selected_layer.layer.offset) {
   _selected_layer.layer.offset = {
      X: 0,
      Y: 0
    }; 
  }
  if (!_selected_layer.layer.dimensions) {
    _selected_layer.layer.dimensions = {
      X: window.$$$currentMap.mapSizeInTiles.width,
      Y: window.$$$currentMap.mapSizeInTiles.height
    };
  }
};

export const getSelectedLayer = () => {
  return _selected_layer;
};

const removeAllSelectedLayers = (selClass) => {
  $("li.layer.selected").removeClass(selClass);
};

const redraw_palette = (map) => {
  list = $('.layers-palette .layers-list');
  list.html("");
  let newLayerContainer = null;
  let l = null;

  const handleEyeball = (layerDiv, layer) => {
    layerDiv.removeClass('eye-open');
    layerDiv.removeClass('eye-closed');

    if (!layer.MAPED_HIDDEN) {
      layerDiv.addClass('eye-open');
    } else {
      layerDiv.addClass('eye-closed');
    }
  };

  $('.layers-palette #layers-new').click((evt) => {
    new_layer_click(evt);
  });

  const addLayerEyeballHandler = ($eyeball, i) => {
    $eyeball.on('click', function (evt) {
      layers[i].MAPED_HIDDEN = !layers[i].MAPED_HIDDEN;

      handleEyeball($eyeball, layers[i]);

      const $friendNode = $(evt.target.parentElement.parentElement).find('.entity_layer .eyeball_button');
      if (!layers[i].MAPED_HIDDEN) {
        $friendNode.prop('disabled', false);
      } else {
        $friendNode.prop('disabled', true);
      }

      evt.stopPropagation();
    });
  };

  const handleEntityEyeball = ($btn, layerName) => {
    $btn.removeClass('showEnts');
    $btn.removeClass('hideEnts');

    if (shouldShowEntitiesForLayer(layerName)) {
      $btn.addClass('showEnts');
    } else {
      $btn.addClass('hideEnts');
    }
  };

  const addEntitySelectHandler = (_$ent_container) => {
    $ent_container = _$ent_container;
    $ent_container.on('click', (evt) => {
      selectEntityLayer();
      evt.stopPropagation();
    });

    $ent_container.on('dblclick', (evt) => {
      window.$$$toggle_pallete('entity', true);

      if (!getNormalEntityVisibility()) {
        $('li.layer.selected button.eyeball_button').click();
      }

      evt.stopPropagation();
    });
  };

  const addLayerEntityEyeballHandler = ($layerContainer, idx) => {
    const layerName = layers[idx].name;
    const $btn = $layerContainer.find('.entity_layer .eyeball_button');

    handleEntityEyeball($btn, layerName);

    $btn.on('click', (evt) => {
      setShowEntitiesForLayer(layerName, !shouldShowEntitiesForLayer(layerName));

      handleEntityEyeball($btn, layerName);

      evt.stopPropagation();
    });
  };

  const addZoneSelectHandler = (_$zone_container) => {
    $zone_container = _$zone_container;
    $zone_container.on('click', (evt) => {
      selectZoneLayer();

      if (!getZoneVisibility()) {
        $('li.layer.selected button.eyeball_button').click();
      }

      evt.stopPropagation();
    });

    $zone_container.on('dblclick', (evt) => {
      window.$$$toggle_pallete('zones', true);

      alert("Summon zone-editing modal?");

      evt.stopPropagation();
    });
  };

  const addLayerSelectHandler = ($layer_container, i) => {
    $layer_container.on('click', (evt) => {
      // TODO: third parameter was 'dialog': where's that coming from
      doLayerSelect($layer_container, i, false, map, evt);

      evt.stopPropagation();
    });
  };

  const addLayerEditHandler = ($layer_container, i) => {
    $layer_container.on('dblclick', (evt) => {
      console.log('addLayerEditHandler', i);
      _layer_click(evt, i);

      evt.stopPropagation();
    });
  };

  const setup_shitty_zone_layer = ($list) => {
    const tmpLayer = {
      MAPED_HIDDEN: !getZoneVisibility(),
      alpha: getZoneAlpha()
    };

    const newLayerContainer = generateLayerContainer(l, 0);
    const $eyeball = generateContent(MAGICAL_ZONE_LAYER_ID, tmpLayer, newLayerContainer);

    newLayerContainer.find('.layer_name').text('Zones');
    newLayerContainer.find('.entity_layer').remove();
    newLayerContainer.addClass('nosort');
    newLayerContainer.data('alpha', getZoneAlpha());
    newLayerContainer.data('rstring_ref', 'ZZZ');

    newLayerContainer.find('.layer_parallax').remove();

    addZoneSelectHandler(newLayerContainer);
    $eyeball.on('click', (evt) => {
      setZoneVisibility(!getZoneVisibility());

      tmpLayer.MAPED_HIDDEN = !getZoneVisibility();

      handleEyeball($eyeball, tmpLayer);

      evt.stopPropagation();
    });

    $list.append(newLayerContainer);
  };

  const addObstructionSelectHandler = (_$obs_container) => {
    $obs_container = _$obs_container;
    $obs_container.on('click', function (evt) {
      selectObstructionLayer();
      if (!getObsVisibility()) {
        $('li.layer.selected button.eyeball_button').click();
      }
      evt.stopPropagation();
    });

    $obs_container.on('dblclick', function (evt) {

      $(() => {

        const map = window.$$$currentMap;

        let dim_x, dim_y, offs_x, offs_y;
        let warning = '';

        if( map.mapData.obstructions_layer ) {
          dim_x = map.mapData.obstructions_layer.dimensions.X;
          dim_y = map.mapData.obstructions_layer.dimensions.Y;
          offs_x = map.mapData.obstructions_layer.offset.X;
          offs_y = map.mapData.obstructions_layer.offset.Y;
        } else {
          [dim_x, dim_y] = map.mapSizeInTiles;
          offs_x = 0;
          offs_y = 0;

          warning = `Warning: using default obs layer dimensions.`;

          if(dim_x*dim_y != map.legacyObsData.length) {
            const datalen = dim_x*dim_y;
            warning += `
              AND the data (length: ${map.legacyObsData.length}) does not match the expected size (${datalen}).  
              Things are likely not rendering correctly.  
              Please specify an explicit layer size.
            `;
          }
        }

        let template = `
          <div class="warning">${warning}</div>
          <div>
            Dimensions: x <input id="obs_dim_x" value="${dim_x}" type="number" style="width: 50px;">
                        y <input id="obs_dim_y" value="${dim_y}" type="number" style="width: 50px;">
          </div>
          <div>
            Offset: x <input id="offs_dim_x" value="${offs_x}" type="number" style="width: 50px;">
                    y <input id="offs_dim_y" value="${offs_y}" type="number" style="width: 50px;">
          </div>
        `;

        $('#modal-dialog').attr('title', 'Change Obstruction Layer attributes');
        $('#modal-dialog').html(template);

        const do_obs_layer_save = () => {
          const new_obs_dim_x = parseInt($('#obs_dim_x').val());
          const new_obs_dim_y = parseInt($('#obs_dim_y').val());
          const new_obs_offs_x = parseInt($('#offs_dim_x').val());
          const new_obs_offs_y = parseInt($('#offs_dim_y').val());

          if( dim_x != new_obs_dim_x || dim_y != new_obs_dim_y ) {
            console.info( "resizing obs layer data..." );
            map.legacyObsData = resize_layer( map.legacyObsData, dim_x, dim_y, new_obs_dim_x, new_obs_dim_y );
          }

          map.mapData.obstructions_layer = {};
          map.mapData.obstructions_layer.dimensions = { X: new_obs_dim_x, Y: new_obs_dim_y };
          map.mapData.obstructions_layer.offset = { X: new_obs_offs_x, Y: new_obs_offs_y };

          dialog.dialog('close');
        };

        $('#modal-dialog').show();
        dialog = $('#modal-dialog').dialog({
          modal: true,
          buttons: {
            'Save': () => { 
              do_obs_layer_save();
            },
            'Cancel': function () {
              dialog.dialog('close');
            }
          },
          close: function () {
            $('#modal-dialog').html('');
          }
        });
      });

      evt.stopPropagation();
    });
  };

  const setup_shitty_layer_seperator = ($list) => {
    $list.append('<li><hr></li>');
  };

  const setup_shitty_obstruction_layer = ($list) => {
    const tmpLayer = {
      MAPED_HIDDEN: !getObsVisibility(),
      alpha: getObsAlpha()
    };

    const newLayerContainer = generateLayerContainer(l, 0);
    const $eyeball = generateContent(MAGICAL_OBS_LAYER_ID, tmpLayer, newLayerContainer);

    newLayerContainer.find('.layer_name').text('Obstructions');
    newLayerContainer.find('.entity_layer').remove();
    newLayerContainer.addClass('nosort');
    newLayerContainer.data('alpha', getObsAlpha());
    newLayerContainer.data('rstring_ref', 'ZZZ');

    newLayerContainer.find('.layer_parallax').remove();

    addObstructionSelectHandler(newLayerContainer);
    $eyeball.on('click', (evt) => {
      setObsVisibility(!getObsVisibility());

      tmpLayer.MAPED_HIDDEN = !getObsVisibility();
      handleEyeball($eyeball, tmpLayer);
      evt.stopPropagation();
    });

    $list.append(newLayerContainer);
  };

  const _setup_entity_eyeball = (node) => {
    const $eyeball = $(node).find('.eyeball_button');
    const tmpLayer = {
      MAPED_HIDDEN: !getNormalEntityVisibility(),
      alpha: 1
    };

    handleEyeball($eyeball, tmpLayer);

    $eyeball.click((evt) => {
      setNormalEntityVisibility(!getNormalEntityVisibility());

      tmpLayer.MAPED_HIDDEN = !getNormalEntityVisibility(); // TODO nouns need to align. entityVisibile vs HIDDEN wtf

      handleEyeball($eyeball, tmpLayer);

      if (!getNormalEntityVisibility()) {
        const $allEntSublayerButtons = $('.entity_layer .eyeball_button');
        $allEntSublayerButtons.prop('disabled', true);
      } else {
        $('.layer').each((a, b) => {
          const $layer = $(b);
          const idx = $layer.data('layer_idx');
          if ($.isNumeric(idx)) {

            //console.log( "layers[",idx,"].MAPED_HIDDEN", layers[idx].MAPED_HIDDEN )

            $layer.find('.entity_layer .eyeball_button').prop('disabled', !!layers[idx].MAPED_HIDDEN);
          }
        });
      }

      evt.stopPropagation();
    });
  };

  function handleEntityExpand(button) {
    button.removeClass('expand');
    button.removeClass('contract');

    if (getEntityLayersExpanded()) {
      button.addClass('expand');

      $('.entity_layer').show();
    } else {
      button.addClass('contract');

      $('.entity_layer').hide();
    }

    resizeWindow();
  }

  function _setup_entity_expand(node) {
    const $expand_entities = $(node).find('.entity_expand_button');

    $expand_entities.click((evt) => {
      setEntityLayersExpanded(!getEntityLayersExpanded());

      handleEntityExpand($expand_entities);

      evt.stopPropagation();
    });
  }

  const setup_shitty_entity_layer = (node, $list) => {
    _setup_entity_eyeball(node);

    _setup_entity_expand(node);

    addEntitySelectHandler(node);

    $list.append(node);
  };

  const reorder_layers_by_rstring_priority = ($list, map) => {
    const childs = $list.children('li');
    childs.detach();

    let rstring_ref = null;
    let rstring_cur_target = null;
    let cur_kid = null;
    let node = null;

    setup_shitty_zone_layer($list);
    setup_shitty_obstruction_layer($list);
    setup_shitty_layer_seperator($list);

    // ZONES
    for (let i = map.layerRenderOrder.length - 1; i >= 0; i--) {
      rstring_cur_target = map.layerRenderOrder[i];
      rstring_ref = parseInt(rstring_cur_target, 10);
      if (isNaN(rstring_ref)) {
        // TODO this is certainly the wrong place to populate "R" and "E" visually.
        if (rstring_cur_target === 'E') {
          node = $(
            "<li class='layer ui-state-default'>" +
            "<button class='eyeball_button'></button>" +
            "<button class='entity_expand_button'></button>" +
            '<span class="name-label">Entities (default)</span></li>');

          node.data('rstring_ref', 'E');
          node.data('layer_name', 'Entity Layer (E)');

          setup_shitty_entity_layer(node, $list);
        } else if (rstring_cur_target === 'R') {
          node = $("<li class='layer ui-state-default'>" +
                   "<button class='eyeball_button question_mark'>?</button>" +
                   "<span class='name-label'>'Render'</span></li>");
          node.data('rstring_ref', 'R');
          $list.append(node);
        } else {
          console.log("UNKNOWN RSTRING PARTICLE '" + rstring_cur_target + "'");
        }

        continue;
      }

      for (let j = childs.length - 1; j >= 0; j--) {
        cur_kid = $(childs[j]);

        if (cur_kid.data('rstring_ref') === rstring_cur_target) {
          $list.append(cur_kid); // re-add to list
          childs.splice(j, 1); // remove from childs array
          break;
        }
      };

      $('.eyeball_button.question_mark').click(function () {
        console.log('unimplemented, weirdo.');
      });
    };

    const $expand_entities = $(node).find('.entity_expand_button');
    handleEntityExpand($expand_entities);
  };

  function resizeWindow() {
    let h = 0;
    let w = 0;

    // / hackery of the worst calibur; probably a flaming trashbin.  do not trust.
    $('.layers-palette').children().each(function (idx, kid) {
      if (idx >= $('.layers-palette').children().length - 3) {
        return; // / the last three are chrome for resizable windows.
      }

      h += $(kid).outerHeight(true);
    });

    w += $('.layers-palette .window-container').outerWidth(true);

    h += 14; // todo fix this - needs to calc from top padding

    $('.layers-palette').width(w);
    $('.layers-palette').height(h);
  }

  function update_lucency(layer, dialog, special_case) {
    let val = $('#new_layer_lucent').val().trim();

    if (!$.isNumeric(val)) {
      modal_error('Invalid input: not numeric.');
      return;
    }

    if (val.indexOf('.') === -1) {
      val = parseInt(val);

      if (val < 0 || val > 100) {
        modal_error('INVALID PERCENTAGE VALUE, range: [0...100]');
        return;
      } else {
        val = val / 100;
      }
    } else { // parse fraction
      val = parseFloat(val);
      if (val < 0 || val > 1) {
        modal_error('INVALID FLOAT VALUE, range:  [0...1]');
        return;
      }
    }

    switch (special_case) {
      case 'zone':
        setZoneAlpha(val);
        break;
      default:
        layer.alpha = val;
        break;
    }

    redrawAllLucentAndParallax();

    dialog.dialog('close');
  }

  function lucent_click(evt) {
    let idx = null;
    let layer = null;
    let dialog = null;
    const $me = $(evt.target).closest('li');
    let special = '';

    // TODO: this is special-case and evil.  make more better.
    if ($me.data('rstring_ref') === 'ZZZ') {
      layer = {
        name: 'Zones',
        alpha: getZoneAlpha()
      };

      special = 'zone';
    } else {
      idx = parseInt($me.data('rstring_ref')) - 1;
      layer = window.$$$currentMap.mapData.layers[idx];
    }

    evt.stopPropagation();

    $(() => {
      let template = '<div>Layer: ' + layer.name + '</div>';
      template += '<div>Current: ' + formatAlphaAsPercentage(layer.alpha) + '</div>';
      template += "<div>New: <input id='new_layer_lucent'>%</div>";

      $('#modal-dialog').attr('title', 'Set layer Opacity');
      $('#modal-dialog').html(template);

      $('#modal-dialog').show();
      dialog = $('#modal-dialog').dialog({
        modal: true,
        buttons: {
          'Save': () => { update_lucency(layer, dialog, special); },
          'Cancel': function () {
            dialog.dialog('close');
          }
        },
        close: function () {
          $('#modal-dialog').html('');
        }
      });
    });
  }

  function parallax_click(evt) {
    const idx = parseInt($(this).closest('li').data('rstring_ref')) - 1;
    const layer = window.$$$currentMap.mapData.layers[idx];

    evt.stopPropagation();

    // var newLucent = dialog
    let dialog = null;

    $(() => {
      let template = '<div>Layer: ' + layer.name + '</div>';
      template += '<div>Current (X:Y): ' + layer.parallax.X + ':' + layer.parallax.Y + '</div>';
      template += "<div>New: <input id='new_layer_parallax_x' size=3>&nbsp;:&nbsp;";
      template += "<input id='new_layer_parallax_y' size=3></div>";

      $('#modal-dialog').attr('title', 'Set layer Parallax');
      $('#modal-dialog').html(template);

      $('#modal-dialog').show();
      dialog = $('#modal-dialog').dialog({
        modal: true,
        buttons: {
          Save: () => { update_parallax(layer, dialog); },
          'Cancel': function () {
            dialog.dialog('close');
          }
        },
        close: function () {
          $('#modal-dialog').html('');
        }
      });
    });
  }

  function update_parallax(layer, dialog) {
    let x = $('#new_layer_parallax_x').val().trim();
    let y = $('#new_layer_parallax_y').val().trim();
    const newParallax = _get_validated_xy_float_input(x, y);
    if (!newParallax) { return; }

    layer.parallax = newParallax;

    redrawAllLucentAndParallax();

    dialog.dialog('close');
  }

  function _get_validated_xy_float_input(x, y) {
    if (!$.isNumeric(x)) {
      modal_error('Invalid input: x not numeric.');
      return null;
    }
    if (!$.isNumeric(y)) {
      modal_error('Invalid input: y not numeric.');
      return null;
    }

    x = parseFloat(x);
    y = parseFloat(y);

    return {X: x, Y: y};
  }

  function formatAlphaAsPercentage(alpha) {
    return (alpha.toFixed(2) * 100);
  }

  function redrawAllLucentAndParallax(map) {
    if (!map) {
      map = window.$$$currentMap;
    }

    $('.layer').each(function (idx, layer) {
      const nodeLayer = $(layer);
      const rstring = nodeLayer.data('rstring_ref');
      let lucentDomNode = null;
      let parallaxDomNode = null;
      let mapLayer = null;

      if (nodeLayer.hasClass('nosort')) {
        if (nodeLayer.data('rstring_ref') === 'ZZZ') {
          lucentDomNode = nodeLayer.find('.layer_lucency');
          lucentDomNode.text(formatAlphaAsPercentage(getZoneAlpha()) + '%');
        }

        return;
      }

      if (!$.isNumeric(rstring)) {
        return;
      } else {
        mapLayer = map.mapData.layers[parseInt(rstring) - 1]; // todo: seperate human-indx from 0-based.
        lucentDomNode = nodeLayer.find('.layer_lucency');
        lucentDomNode.text(formatAlphaAsPercentage(mapLayer.alpha) + '%');

        parallaxDomNode = nodeLayer.find('.layer_parallax');
        parallaxDomNode.text(mapLayer.parallax.X + ':' + mapLayer.parallax.Y);

        if (!$.isNumeric(mapLayer.alpha)) {
          debugger;
        }

        nodeLayer.data('alpha', mapLayer.alpha); // TODO: remove this, only one source of truth: the data.
      }
    });
  }

  function generateContent(i, l, $parent) {
    const normalContainer = $("<div class='normal_layer'></div>");

    const visible_div = $("<button class='eyeball_button'></button>");
    const tall_div = $("<button class='tall-entity-layer' title='Tall entities redraw on this layer'></button>");
    const name_div = $("<div class='layer_name'></div>");

    const right_div = $("<div class='rightmost_div'></div>");

    const lucent_div = $("<div class='layer_lucency'></div>");
    const parallax_div = $("<div class='layer_parallax'>?:?</div>");

    const entityContainer = $("<div class='entity_layer'><button class='eyeball_button'></button>" +
                              "<div class='layer_name'></div></div>");

    const entity_name_div = entityContainer.find('.layer_name');

    handleEyeball(visible_div, l);

    // TODO we are using id's as classes for most buttons.  STOPIT.
    name_div.html(
      '<button class="no-button" id="white-icon-art"></button> <span class="name-label">' + l.name + '</span>'
    );
    entity_name_div.html(
      '<button class="no-button" id="white-icon-entity"></button> <span class="entity-name-label">' + l.name + '</span>'
    );

    lucent_div.text(formatAlphaAsPercentage(l.alpha) + '%');

    lucent_div.click(lucent_click);
    parallax_div.click(parallax_click);

    normalContainer.append(visible_div);

    if (l === window.$$$currentMap.getEntityTallRedrawLayer()) {
      normalContainer.append(tall_div);
    }

    normalContainer.append(name_div);

    // right div
    right_div.append(lucent_div);
    right_div.append(parallax_div);

    normalContainer.append(right_div);

    $parent.append(entityContainer);
    $parent.append(normalContainer);

    return visible_div;
  }

  function generateLayerContainer(layer, layer_index) {
    const newLayerContainer = $("<li class='layer ui-state-default'></li>");
    newLayerContainer.data('alpha', layer.alpha);
    newLayerContainer.data('rstring_ref', '' + (layer_index + 1));
    newLayerContainer.data('layer_name', layer.name);
    newLayerContainer.data('layer_idx', layer_index);

    return newLayerContainer;
  }

  let eyeballButton = null;

  for (let i = layers.length - 1; i >= 0; i--) {
    l = layers[i];

    newLayerContainer = generateLayerContainer(l, i);
    eyeballButton = generateContent(i, l, newLayerContainer);

    addLayerEntityEyeballHandler(newLayerContainer, i);
    addLayerEyeballHandler(eyeballButton, i);
    addLayerSelectHandler(newLayerContainer, i);
    addLayerEditHandler(newLayerContainer, i);

    list.append(newLayerContainer);
  };

  // / RSTRING is weird and needs to die.
  reorder_layers_by_rstring_priority(list, map);
  resizeWindow();

  // / make the layers sortable
  $('.layers-list').sortable({
    revert: true,
    cancel: '.nosort'
  });
  $('ul, li').disableSelection();

  const skipWeirdThings = (rstring_val) => {
    if (rstring_val === 'ZZZ') {
      return true;
    }

    return false;
  };

  $('.layers-list').on('sortupdate', function (event, ui) {
    const kids = $('.layers-list').children();
    let i = null;
    let val = null;

    const rstring = [];

    try {
      for (i in kids) {
        if (kids.hasOwnProperty(i)) {
          val = $(kids[i]).data('rstring_ref');
          if (val && !skipWeirdThings(val)) {
            rstring.unshift($(kids[i]).data('rstring_ref'));
          }
        }
      }
    } catch (e) {
      console.log('error');
      console.log(e);
      throw e;
    }

    window.$$$currentMap.updateRstring(rstring);
  });

  redrawAllLucentAndParallax(map);
};

function get_layernames_by_rstring_order() {
  const ret = [];
  const childs = list.children('li');
  let cur_kid = null;
  let rstring_cur_target = null;
  let rstring_ref = null;

  const map = window.$$$currentMap;

  for (let i = map.layerRenderOrder.length - 1; i >= 0; i--) {
    rstring_cur_target = map.layerRenderOrder[i];
    rstring_ref = parseInt(rstring_cur_target, 10);

    if (isNaN(rstring_ref)) {
      switch (rstring_cur_target) {
        case 'E':
          ret.push('Entity Layer (E)');
          continue;

        case 'R': // ignore everything else for now
        default:
          continue;
      }
    }

    for (let j = childs.length - 1; j >= 0; j--) {
      cur_kid = $(childs[j]);
      if (cur_kid.data('rstring_ref') === rstring_cur_target) {
        ret.push(cur_kid.data('layer_name'));
        break;
      }
    };
  }

  return ret;
};

let template = `
<div>Name: <input id='layer_name'></div>

<div>Parallax: x: <input id='layer_parallax_x' value='1' size=3> 
   y: <input id='layer_parallax_y' value='1' size=3></div>

<div>Dimensions (tiles): w: <input id='layer_dims_x' size=3> h: <input id='layer_dims_y' size=3></div>

<div>Offset (pixels): x: <input id='layer_offset_x' value='0' size=3> y: <input id='layer_offset_y' value='0' size=3></div>

<div>Alpha: <input id='layer_opacity' value='1' size=3></div>

<div>vsp: <input id='layer_vsp' value='default'></div>

<div>isTallEntity Redraw Layer? <input type='checkbox' id='layer_is_tall_redraw_layer'></div>

<div>Index: <span id='layer_idx'></span></div>

<div>Border Color: 
  <input hidden id='layer_border_color' value='' />
  <span id='border_color'>Off</span> 
  <input type='text' id="full-spectrum-inline"/>
  <button id='border_off_button'>Turn off</button>
</div>
`;

function setup_template() {
  const $template = $(template);

  const $dims_x = $template.find('#layer_dims_x');
  const $dims_y = $template.find('#layer_dims_y');

  if (window.$$$currentMap) {
    $dims_x.val(window.$$$currentMap.mapSizeInTiles.width);
    $dims_y.val(window.$$$currentMap.mapSizeInTiles.height);
  }

  return $template;
}

let dialog = null;
const closeEditLayerDialog = () => {
  if (dialog) {
    dialog.dialog('close');
    dialog = null;
  }
};

let curLayer = generate_layer();

/// TODO this function is overused and a wreck and has side-effects.
function _layer_click(evt, layerIdx, onComplete) {
  evt.stopPropagation();

  if (dialog) {
    closeEditLayerDialog();
  }

  if (typeof layerIdx === 'undefined') {
    layerIdx = false;
  }

  $(() => {
    const $template = setup_template();
    let newLayerId = null;

    const setLayerColor = (layer, color) => {
      $template.find('#layer_border_color').val(color);
      updateLayerColorUI(layer);
    };

    let off_button_initialized = false;

    $('#modal-dialog').html('');
    $('#modal-dialog').append($template);

    const colorPicker = $('#full-spectrum-inline').spectrum({
      color: $template.find('#layer_border_color').val(),
      showInput: true,
      // showAlpha: true,
      className: "full-spectrum",
      showInitial: true,
      showSelectionPalette: true,
      maxSelectionSize: 10,
      preferredFormat: "hex",
      change: function(color) {
        const _color = color.toHexString() + "ff";
        setLayerColor(curLayer, _color);
        colorPicker.spectrum("set", color.toHexString());
      }
    });

    const updateLayerColorUI = (layer, _color) => {

      const color = _color || $template.find('#layer_border_color').val();

      if(color) {

        $template.find('#border_color').text(color.substr(0,7));
        $template.find('#border_off_button').css('display', 'inline');

        if(!off_button_initialized) {
          $template.find("#border_off_button").click( () => {
            setLayerColor(layer, null);
          } );

          off_button_initialized = true;
        }
        
      } else {
        $template.find('#border_color').text("none");
        $template.find('#border_color_example').css('display', 'none');
        $template.find('#border_off_button').css('display', 'none');
        colorPicker.spectrum("set", "00000000");
      }
    }

    let title = null;

    const buttonsLol = [{
      id: "confirm-layer",
      text: "Save",
      click: () => { update_layer(dialog, newLayerId, onComplete); }
    }, {
      id: "cancel-layer",
      text: "Cancel",
      click: function () { closeEditLayerDialog(); }
    }];

    if (typeof layerIdx === 'number') {
      const layer = window.$$$currentMap.mapData.layers[layerIdx]; // TODO needs better accessor
      curLayer = layer;

      title = 'Edit Layer: ' + layer.name;

      $template.find('#layer_name').val(layer.name);
      $template.find('#layer_parallax_x').val(layer.parallax.X);
      $template.find('#layer_parallax_y').val(layer.parallax.Y);
      $template.find('#layer_dims_x').val(layer.dimensions.X);
      $template.find('#layer_dims_y').val(layer.dimensions.Y);
      $template.find('#layer_offset_x').val(layer.offset.X);
      $template.find('#layer_offset_y').val(layer.offset.Y);
      $template.find('#layer_opacity').val(layer.alpha);
      $template.find('#layer_vsp').val(layer.vsp);
      $template.find('#layer_idx').text(layerIdx);
      $template.find('#layer_is_tall_redraw_layer').prop(
        'checked', layer === window.$$$currentMap.getEntityTallRedrawLayer()
      );

      $template.find('#layer_border_color').val(layer.borderColor_hex);
      updateLayerColorUI(layer, layer.borderColor_hex);
      if(layer.borderColor_hex) {
        colorPicker.spectrum("set", layer.borderColor_hex.substr(0,7));
      }

      newLayerId = layerIdx;

      buttonsLol.unshift({
        id: "delete-layer",
        text: "DELETE",
        click: () => { if( confirm('Are you sure?') ) {
          const me = layer;
          const myIdx = layerIdx;

          if(myIdx === 0) {
            alert('You cannot delete the base layer (index 0) presently.');
            return;
          } 

          if(layer === window.$$$currentMap.getEntityTallRedrawLayer()) {
            alert('You cannot delete the tall redraw layer.  Please set it to another layer and try again.');
            return;
          }

          window.$$$currentMap.layers.splice(myIdx, 1);
          window.$$$currentMap.mapRawTileData.tile_data.splice(myIdx, 1);

          const newOrder = [];
          const oldOrder = window.$$$currentMap.layerRenderOrder;
          for(let i=0; i<oldOrder.length; i++) {
            const targ = oldOrder[i];
            if(!$.isNumeric(targ)) {
              newOrder.push(targ);
            } else {
              const num = parseInt(targ);
              if(num === myIdx+1) {
                continue;
              } else if(num > myIdx) {
                newOrder.push(""+num-1);
              } else {
                newOrder.push(""+num);
              }
            }
          }

          window.$$$currentMap.updateRstring(newOrder);
          window.$$$currentMap.regenerateLayerLookup();

          initLayersWidget(window.$$$currentMap);

          closeEditLayerDialog();
        } },
      });
    } else if (window.$$$currentMap) {
      title = 'Add New Layer';
      newLayerId = window.$$$currentMap.mapData.layers.length;
    } else {
      title = 'Create Base Layer';
      newLayerId = 0;
    }

    $('#modal-dialog').show();

    dialog = $('#modal-dialog').dialog({
      width: 500,
      modal: true,
      title: title,
      buttons: buttonsLol,
      close: function () {
        curLayer = null;
        $('#modal-dialog').html('');
      }
    });
  });
}

const update_layer = (dialog, layer_id, onComplete) => {
  const name = dialog.find('#layer_name').val();
  const par_x = dialog.find('#layer_parallax_x').val();
  const par_y = dialog.find('#layer_parallax_y').val();
  let dims_x = dialog.find('#layer_dims_x').val();
  let dims_y = dialog.find('#layer_dims_y').val();
  let offset_x = dialog.find('#layer_offset_x').val();
  let offset_y = dialog.find('#layer_offset_y').val();
  let alpha = dialog.find('#layer_opacity').val();
  const vsp = dialog.find('#layer_vsp').val();
  const borderColor_hex = dialog.find('#layer_border_color').val();
  const borderColor = hexToRgba(borderColor_hex);

  let layer = null;

  // Validate Parallax
  if (!$.isNumeric(par_x)) {
    modal_error('Invalid input: parallax x (' + par_x + ') is invalid.');
    return;
  }
  if (!$.isNumeric(par_y)) {
    modal_error('Invalid input: parallax y (' + par_y + ') is invalid.');
    return;
  }
  
  // Validate Dimensions
  if (!$.isNumeric(dims_x) && dims_x >= 0) {
    modal_error('Invalid input: dimension x (' + dims_x + ') is invalid.');
    return;
  }
  dims_x = parseInt(dims_x);
  if (!$.isNumeric(dims_y) && dims_y >= 0) {
    modal_error('Invalid input: dimension y (' + dims_y + ') is invalid.');
    return;
  }
  dims_y = parseInt(dims_y);

  // Validate Offsets
  if (!$.isNumeric(offset_x)) {
    modal_error('Invalid input: offset x (' + offset_x + ') is invalid.');
    return;
  }
  offset_x = parseInt(offset_x);
  if (!$.isNumeric(offset_y)) {
    modal_error('Invalid input: ofset y (' + offset_y + ') is invalid.');
    return;
  }
  offset_y = parseInt(offset_y);

  if (!$.isNumeric(alpha) || alpha < 0 || alpha > 1) {
    modal_error('Invalid input: alpha (' + alpha + ') is invalid.  Try values [0..1]');
    return;
  }

  if (!name) {
    modal_error('Invalid name: you must define a name.');
    return;
  }

  let map = null;
  let layers = null;

  if (onComplete) {
    map = {};
    map.mapRawTileData = {};
    map.mapRawTileData.tile_data = [];
    map.layerLookup = {};
    map.layerRenderOrder= [];
    map.setEntityTallRedrawLayerByName = () => {
      console.warn('Haha, this function does NOTHING!');
    };

    layers = [];
  } else {
    map = window.$$$currentMap;
    layers = map.mapData.layers;
  }

  const nameSet = layers.map((l) => { return l.name; });

  if (nameSet.indexOf(name) !== -1) {
    if (layers[layer_id] && layers[layer_id].name !== name) {
      modal_error('Invalid input: layer name (' + name + ') is not unique on this map.  Try a new, unique name.');
      return;
    }
  }

  let old_dim_x; 
  let old_dim_y;
  const new_dim_x = parseInt(dims_x);
  const new_dim_y = parseInt(dims_y);

  alpha = parseFloat(alpha);

  layer = generate_layer(name, alpha, new_dim_x, new_dim_y, offset_x, offset_y, par_x, par_y, vsp, borderColor_hex, borderColor);

  if (layer_id === layers.length) {
    old_dim_x = new_dim_x;
    old_dim_y = new_dim_y;
    layers.push(layer);
    const layersLength = layers.length;
    map.layerLookup[name] = layers[layersLength - 1];
    map.layerRenderOrder.push('' + (layersLength));
    map.mapRawTileData.tile_data.push(new Array((dims_x * dims_y)).fill(0));

    map.updateRstring(map.layerRenderOrder.join(','));
  } else {
    old_dim_x = layers[layer_id].dimensions.X;
    old_dim_y = layers[layer_id].dimensions.Y;

    // TODO do all layer-name-updating here
    if (name !== layers[layer_id].name) {
      const oldName = layers[layer_id].name;

      map.layerLookup[name] = map.layerLookup[oldName];
      delete map.layerLookup[oldName];
    }

    for (const k in layer) {
      layers[layer_id][k] = layer[k];
    }
  }

  if( old_dim_y != new_dim_y || old_dim_x != new_dim_x ) {
    console.log( "Resizing layer..." );
    map.mapRawTileData.tile_data[layer_id] = resize_layer( map.mapRawTileData.tile_data[layer_id], old_dim_x, old_dim_y, new_dim_x, new_dim_y );
    
    const oldx = map.mapSizeInTiles.width;
    const oldy = map.mapSizeInTiles.height;

    map.calculateSize();
    map.regenerateZoneData();
    map.legacyObsData = map.mapRawTileData.legacy_obstruction_data = resize_layer( 
      map.mapRawTileData.legacy_obstruction_data, 
      oldx, oldy, 
      map.mapSizeInTiles.width, map.mapSizeInTiles.height 
    );

    map.setCanvas($('.map_canvas'));
  }

  if (window.document.getElementById('layer_is_tall_redraw_layer').checked) {
    map.setEntityTallRedrawLayerByName(name);
  }

  if (!onComplete) {
    redraw_palette(map);
    // updateRstringInfo();
  }

  closeEditLayerDialog();

  if (onComplete) {
    onComplete(map, layers);
  }
};

export const LayersWidget = {
  initLayersWidget: initLayersWidget,
  get_layernames_by_rstring_order: get_layernames_by_rstring_order
};
