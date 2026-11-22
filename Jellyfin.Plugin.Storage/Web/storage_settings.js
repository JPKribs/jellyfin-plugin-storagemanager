// storage_settings.js
// The Settings tab: the full disk alerts every disk uses unless it has its own, the disk health alerts, when library
// scans are blocked, remounting, and real-time monitoring, with Save.

import {
    createStoragePage, createAlertEditor, createChoiceGroup, createSaveBar, createCheckbox, createSliderField, t
} from './configurationpage?name=storage_common.js';

export default function (view) {
    'use strict';

    var page = createStoragePage(view, 1, { bind: bind, load: load });
    var Shared = page.shared;

    var alerts = null;
    var health = null;
    var scanGuard = null;
    var bar = null;
    var tracker = Shared.createChangeTracker({ serialize: serialize });
    page.guardUnsaved(tracker);

    function el(id) { return view.querySelector('#' + id); }

    // serialize
    // The settings as text, to tell whether they changed since the last load or save.
    //
    // Output
    // [string]: The settings.
    function serialize() {
        if (!scanGuard) return '';
        return JSON.stringify([alerts.getValue(), health.getValue(), scanGuard.get(), Shared.getChecked('chkRemount'), Shared.getChecked('chkMuteMonitoring')]);
    }

    function changed() {
        if (bar) bar.setDirty(tracker.check());
    }

    function save() {
        var problem = alerts.errorText();
        if (problem) return Promise.reject(new Error(problem));
        return Shared.saveConfigWith(function (config) {
            var value = alerts.getValue();
            config.WarningStop = value.WarningStop;
            config.ErrorStop = value.ErrorStop;
            config.HealthAlerts = health.getValue();
            config.ScanGuard = scanGuard.get() || 'Affected';
            config.Remount = Shared.getChecked('chkRemount');
            config.MuteMonitoring = Shared.getChecked('chkMuteMonitoring');
        }).then(function () {
            tracker.markClean();
        });
    }

    // createHealthEditor
    // The disk health alerts: a Failing checkbox on its own row, a Too hot and a Worn out checkbox, and a panel with a slider for Too hot and
    // Worn out while each is on, laid out like the full disk alerts above them.
    //
    // Inputs
    // onChange [function]: Called after each change.
    //
    // Output
    // [object]: { element, getValue(), setValue(value) }, where a value is the configuration's HealthAlerts.
    function createHealthEditor(onChange) {
        var root = document.createElement('div');
        root.className = 'storage-alert-editor';
        // Failing has no setting of its own, so it sits on its own row above the two alerts that do.
        root.innerHTML = '<div class="base-field"><label></label><div class="storage-alert-failing"></div>'
            + '<div class="base-field-row storage-alert-checks" role="group"></div></div>'
            + '<div class="base-field-row storage-alert-panels"></div>';
        root.querySelector('label').textContent = t.tr('LabelHealth');
        var checksRow = root.querySelector('.storage-alert-checks');
        checksRow.setAttribute('aria-label', t.tr('LabelHealth'));
        var panels = root.querySelector('.storage-alert-panels');

        var checks = {};
        var sliders = {};
        var boxes = {};
        [
            { key: 'Failing', label: t.tr('HealthFailing'), help: t.tr('HelpAlertFailing') },
            { key: 'Hot', label: t.tr('AlertHot'), help: t.tr('HelpAlertHot'), icon: 'thermostat', tone: 'error', point: t.tr('HelpHotPoint'), min: 40, max: 80, start: 60, suffix: ' °C' },
            { key: 'Worn', label: t.tr('AlertWorn'), help: t.tr('HelpAlertWorn'), icon: 'battery_alert', tone: 'warning', point: t.tr('HelpWornPoint'), min: 50, max: 100, start: 90, suffix: t.tr('UnitPercentUsed') }
        ].forEach(function (alert) {
            checks[alert.key] = createCheckbox({
                label: alert.label,
                description: alert.help,
                size: 'large',
                checked: true,
                onChange: function () {
                    show();
                    onChange();
                }
            });
            (alert.min ? checksRow : root.querySelector('.storage-alert-failing')).appendChild(checks[alert.key].element);
            if (!alert.min) return;

            var panel = document.createElement('div');
            panel.className = 'base-panel storage-alert-panel';
            panel.innerHTML = '<div class="base-panel-header storage-alert-header"><span class="material-icons storage-alert-' + alert.tone + '" aria-hidden="true">'
                + alert.icon + '</span><span></span></div><div class="base-panel-body"><div class="fieldDescription"></div></div>';
            panel.querySelector('.storage-alert-header span:last-child').textContent = alert.label;
            var body = panel.querySelector('.base-panel-body');
            body.querySelector('.fieldDescription').textContent = alert.point;
            sliders[alert.key] = createSliderField({ min: alert.min, max: alert.max, step: 1, value: alert.start, suffix: alert.suffix, label: alert.label, onChange: onChange });
            body.insertBefore(sliders[alert.key].element, body.lastChild);
            panels.appendChild(panel);
            boxes[alert.key] = panel;
        });

        function show() {
            Object.keys(boxes).forEach(function (key) { boxes[key].classList.toggle('hidden', !checks[key].getValue()); });
        }

        show();
        return {
            element: root,
            getValue: function () {
                return {
                    Failing: checks.Failing.getValue(),
                    Hot: checks.Hot.getValue(),
                    HotCelsius: sliders.Hot.getValue(),
                    Worn: checks.Worn.getValue(),
                    WornPercent: sliders.Worn.getValue()
                };
            },
            setValue: function (value) {
                checks.Failing.setValue(value.Failing !== false);
                checks.Hot.setValue(value.Hot !== false);
                checks.Worn.setValue(value.Worn !== false);
                sliders.Hot.setValue(Math.min(80, Math.max(40, value.HotCelsius || 60)));
                sliders.Worn.setValue(Math.min(100, Math.max(50, value.WornPercent || 90)));
                show();
            }
        };
    }

    function bind() {
        alerts = createAlertEditor({ onChange: changed });
        el('alertEditorMount').appendChild(alerts.element);
        health = createHealthEditor(changed);
        el('healthEditorMount').appendChild(health.element);
        scanGuard = createChoiceGroup(el('scanGuardChoices'), { onChange: changed });
        Shared.bindEvent('chkRemount', 'change', changed);
        Shared.bindEvent('chkMuteMonitoring', 'change', changed);
        bar = createSaveBar({ form: el('StorageSettingsForm'), fill: true, onSave: save });
        el('saveBarMount').appendChild(bar.element);
    }

    function load() {
        Shared.getConfig().then(function (config) {
            alerts.setValue({
                WarningStop: config.WarningStop || { Enabled: true, Value: 90, Unit: 'Percent' },
                ErrorStop: config.ErrorStop || { Enabled: true, Value: 95, Unit: 'Percent' }
            });
            health.setValue(config.HealthAlerts || {});
            scanGuard.set(config.ScanGuard || 'Affected');
            Shared.setChecked('chkRemount', config.Remount !== false);
            Shared.setChecked('chkMuteMonitoring', config.MuteMonitoring !== false);
            tracker.markClean();
            bar.setDirty(false);
        }).catch(function () {
            bar.setState('failed', t.tr('ErrorLoadSettings'));
        });
    }
}
