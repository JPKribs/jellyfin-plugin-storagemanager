// storage_common.js
// Shared by the Storage tabs: the only module that imports Base, the page wrapper, the tab bar, and the plugin's
// strings.

import {
    createConfigPage, loadTranslations, createTranslations, setTabs,
    createRecordList, createUsageMeter, createPieChart, createStatCard, createSpinner, createPillGroup, createDefinitionList, openDialog, escapeHtml,
    createCheckbox, createSliderField, createChoiceGroup, createSaveBar, createInheritField, confirmDialog
} from './configurationpage?name=storage_jpkribs_shared.js';

export {
    createRecordList, createUsageMeter, createPieChart, createStatCard, createSpinner, createPillGroup, createDefinitionList, openDialog, escapeHtml,
    createCheckbox, createSliderField, createChoiceGroup, createSaveBar, createInheritField, confirmDialog
};

export var PLUGIN_ID = '0d1ca63a-1bd8-45b2-882a-9aaa51b456c3';

// The plugin's strings once loaded. Until then, and when they cannot load, a key reads as its fallback.
var strings = createTranslations({});
var stringsReady = null;

// t
// Reads the plugin's strings, in the viewer's language once loadStrings has finished.
//
// Output
// [object]: { tr(key, fallback), format(key, ...values), title(key), sentence(key), named(text), language }.
export var t = {
    tr: function (key, fallback) { return strings.tr(key, fallback); },
    format: function () { return strings.format.apply(strings, arguments); },
    title: function (key) { return strings.title(key); },
    sentence: function (key) { return strings.sentence(key); },
    named: function (text) { return named(text); },
    get language() { return strings.language; }
};

// named
// Spells a name as the casing list writes it, such as exFAT or APFS, else in capitals, as names like a file system are.
//
// Inputs
// text [string]: The name as the server reports it, such as exfat.
//
// Output
// [string]: The name as shown.
function named(text) {
    var lower = String(text).toLowerCase();
    var found = (strings.casing || []).filter(function (word) { return word.toLowerCase() === lower; })[0];
    return found || String(text).toUpperCase();
}

// loadStrings
// Loads the plugin's strings in the viewer's language, once per page load.
//
// Output
// [Promise]: Resolves with the translations handle. It never rejects.
export function loadStrings() {
    if (!stringsReady) {
        stringsReady = loadTranslations('Storage/Translations').then(function (loaded) {
            strings = loaded;
            return loaded;
        });
    }
    return stringsReady;
}

// TABS
// The tab bar, in the viewer's language once the strings load.
//
// Output
// [Array]: { href, name } for each tab.
export function TABS() {
    return [
        { href: 'configurationpage?name=storage_storage', name: t.tr('TabStorage', 'Storage') },
        { href: 'configurationpage?name=storage_settings', name: t.tr('Settings', 'Settings') }
    ];
}

// createStoragePage
// Wraps Base's createConfigPage with the plugin ID and the tab bar, so each tab names only its index. bind and
// load wait for the plugin's strings, and the page's marked markup is translated before bind runs.
//
// Inputs
// view [HTMLElement]: The page the dashboard passes to the module.
// tabIndex [number]: The tab this page is, from 0.
// options [object]: The rest of createConfigPage's options, such as bind, load, and isDirty.
//
// Output
// [object]: The page handle from createConfigPage.
export function createStoragePage(view, tabIndex, options) {
    var ready = loadStrings();
    return createConfigPage(view, Object.assign({}, options, {
        pluginId: PLUGIN_ID,
        tabsKey: 'storage',
        tabIndex: tabIndex,
        tabs: TABS,
        bind: function (shared, page) {
            ready.then(function () {
                setTabs('storage', tabIndex, TABS);
                strings.apply(view);
                if (options.bind) options.bind(shared, page);
            });
        },
        load: function (shared, page) {
            ready.then(function () {
                if (options.load) options.load(shared, page);
            });
        }
    }));
}

// The range of each unit's sliders, and where a new alert starts. GB free goes to 2 TB in steps of 10, enough for
// any alert worth setting.
var RANGES = {
    Percent: { min: 50, max: 100, step: 1, warning: 90, error: 95 },
    Gigabytes: { min: 10, max: 2000, step: 10, warning: 100, error: 20 }
};

// alertText
// How a pair of alerts reads in one line, such as 90% · 95% or 100 GB free · 20 GB free.
//
// Inputs
// value [object]: { WarningStop, ErrorStop } as the configuration keeps them.
//
// Output
// [string]: The alerts that are on, or Off.
export function alertText(value) {
    var parts = [value.WarningStop, value.ErrorStop].filter(function (stop) { return stop && stop.Enabled; }).map(function (stop) {
        var number = Math.round(stop.Value * 10) / 10;
        return stop.Unit === 'Gigabytes' ? t.format('StopGigabytesFree', number) : t.format('StopPercentUsed', number);
    });
    return parts.length ? parts.join(' · ') : t.tr('Off', 'Off');
}

// createAlertEditor
// The full disk alerts: a Storage low and a Storage full checkbox, what they measure, and a panel with a slider for each alert
// that is on. The Storage full alert is kept past the Storage low alert while both are on. Every control is built once and
// shown or hidden, so an inherit field that disables it covers all of it.
//
// Inputs
// options [object]: { heading, onChange() }. heading false leaves out the Full disk alerts label, for a place that
//                   already has it as its title (default true). onChange is called after each change [optional].
//
// Output
// [object]: { element, getValue(), setValue(value), errorText(), destroy() }, where a value is { WarningStop, ErrorStop }.
export function createAlertEditor(options) {
    var opts = options || {};
    var unit = 'Percent';
    var ordering = false;
    var root = document.createElement('div');
    root.className = 'storage-alert-editor';
    root.innerHTML = '<div class="base-field"><label></label><div class="base-field-row storage-alert-checks" role="group"></div></div>'
        + '<div class="base-field storage-alert-unit"><label></label><div class="base-pill-group" role="group">'
        + '<button type="button" class="base-pill" data-value="Percent" aria-pressed="false"></button>'
        + '<button type="button" class="base-pill" data-value="Gigabytes" aria-pressed="false"></button></div></div>'
        + '<div class="base-field-row storage-alert-panels"></div>';
    var labels = root.querySelectorAll('.base-field > label');
    labels[0].textContent = t.tr('TabStorage');
    if (opts.heading === false) labels[0].remove();
    labels[1].textContent = t.tr('LabelMeasurement');
    root.querySelector('.storage-alert-checks').setAttribute('aria-label', t.tr('TabStorage'));
    var pillGroup = root.querySelector('.base-pill-group');
    pillGroup.setAttribute('aria-label', t.tr('LabelMeasurement'));
    pillGroup.children[0].textContent = t.tr('UnitUsage');
    pillGroup.children[1].textContent = t.tr('LabelSize');
    var unitField = root.querySelector('.storage-alert-unit');

    var alerts = {};
    [
        { stop: 'warning', icon: 'warning', label: t.tr('AlertLow'), help: t.tr('HelpWarningAt'), point: t.tr('HelpWarningPoint') },
        { stop: 'error', icon: 'error', label: t.tr('AlertFull'), help: t.tr('HelpErrorAt'), point: t.tr('HelpErrorPoint') }
    ].forEach(function (alert) {
        var check = createCheckbox({
            label: alert.label,
            description: alert.help,
            size: 'large',
            checked: true,
            onChange: function () {
                show();
                keepOrder(alert.stop);
                changed();
            }
        });
        root.querySelector('.storage-alert-checks').appendChild(check.element);

        var panel = document.createElement('div');
        panel.className = 'base-panel storage-alert-panel';
        panel.innerHTML = '<div class="base-panel-header storage-alert-header"><span class="material-icons storage-alert-' + alert.stop + '" aria-hidden="true">'
            + alert.icon + '</span><span></span></div><div class="base-panel-body"><div class="fieldDescription"></div></div>';
        panel.querySelector('.storage-alert-header span:last-child').textContent = alert.label;
        var body = panel.querySelector('.base-panel-body');
        body.querySelector('.fieldDescription').textContent = alert.point;

        // One slider per unit, so switching units keeps where each one sits.
        var sliders = {};
        Object.keys(RANGES).forEach(function (name) {
            var range = RANGES[name];
            sliders[name] = createSliderField({
                min: range.min,
                max: range.max,
                step: range.step,
                value: range[alert.stop],
                suffix: name === 'Gigabytes' ? ' ' + t.tr('UnitGigabytesFree') : t.tr('UnitPercentUsed'),
                label: alert.label,
                onChange: function () {
                    keepOrder(alert.stop);
                    changed();
                }
            });
            body.insertBefore(sliders[name].element, body.lastChild);
        });
        root.querySelector('.storage-alert-panels').appendChild(panel);
        alerts[alert.stop] = { check: check, panel: panel, sliders: sliders };
    });

    var pills = createPillGroup(pillGroup, {
        onChange: function (next) {
            if (!next || next === unit) return;
            unit = next;
            show();
            keepOrder('error');
            changed();
        }
    });

    function isOn(stop) { return alerts[stop].check.getValue(); }

    function slider(stop) { return alerts[stop].sliders[unit]; }

    function changed() { if (opts.onChange) opts.onChange(); }

    // show
    // Shows each alert's panel while it is on, only the current unit's slider in it, and Measurement while either is on.
    function show() {
        ['warning', 'error'].forEach(function (stop) {
            alerts[stop].panel.classList.toggle('hidden', !isOn(stop));
            Object.keys(RANGES).forEach(function (name) {
                alerts[stop].sliders[name].element.classList.toggle('hidden', name !== unit);
            });
        });
        unitField.classList.toggle('hidden', !isOn('warning') && !isOn('error'));
    }

    // keepOrder
    // Keeps the Storage full alert past the Storage low alert while both are on: more used for Usage, less free for Size. The
    // slider that moved stops one step short of the other, which moves only when the scale has no room left.
    //
    // Inputs
    // moved [string]: warning or error, the slider that changed.
    function keepOrder(moved) {
        if (ordering || !isOn('warning') || !isOn('error')) return;
        var range = RANGES[unit];
        // Usage grows toward full and Size shrinks toward full, so the Storage full alert sits one step further that way.
        var toward = unit === 'Gigabytes' ? -range.step : range.step;
        var warning = slider('warning').getValue();
        var error = slider('error').getValue();
        if ((error - warning) * toward >= range.step) return;
        var clamp = function (value) { return Math.min(range.max, Math.max(range.min, value)); };
        ordering = true;
        if (moved === 'error') {
            error = clamp(warning + toward);
            // At the end of the scale there is no room past the Storage low alert, so it makes way.
            if (error === warning) warning = clamp(error - toward);
        } else {
            warning = clamp(error - toward);
            if (warning === error) error = clamp(warning + toward);
        }
        slider('warning').setValue(warning);
        slider('error').setValue(error);
        ordering = false;
    }

    function readStop(stop) {
        return { Enabled: isOn(stop), Value: slider(stop).getValue(), Unit: unit };
    }

    function writeStop(stop, value) {
        var range = RANGES[unit];
        var at = value && typeof value.Value === 'number' ? value.Value : range[stop];
        alerts[stop].check.setValue(!value || value.Enabled !== false);
        slider(stop).setValue(Math.min(range.max, Math.max(range.min, at)));
    }

    function setValue(value) {
        value = value || {};
        unit = value.WarningStop && value.WarningStop.Unit === 'Gigabytes' ? 'Gigabytes' : 'Percent';
        pills.set(unit);
        writeStop('warning', value.WarningStop);
        writeStop('error', value.ErrorStop);
        show();
    }

    show();
    pills.set(unit);

    return {
        element: root,
        getValue: function () { return { WarningStop: readStop('warning'), ErrorStop: readStop('error') }; },
        setValue: setValue,
        // errorText
        // Why the alerts can't be saved, such as a Storage full alert that fires before the Storage low alert, or an empty string.
        errorText: function () {
            if (!isOn('warning') || !isOn('error')) return '';
            var warning = slider('warning').getValue();
            var error = slider('error').getValue();
            var inOrder = unit === 'Gigabytes' ? error < warning : error > warning;
            return inOrder ? '' : t.tr(unit === 'Gigabytes' ? 'ErrorAlertOrderGigabytes' : 'ErrorAlertOrderPercent');
        },
        destroy: function () {
            pills.destroy && pills.destroy();
            ['warning', 'error'].forEach(function (stop) {
                alerts[stop].check.destroy();
                Object.keys(RANGES).forEach(function (name) { alerts[stop].sliders[name].destroy(); });
            });
        }
    };
}
