// storage_storage.js
// The Storage tab: counts of disks by state, one row per disk or share, filtered to disks in use or all disks, and
// a dialog with each disk's space, stops, libraries, and folders.

import {
    createStoragePage, createRecordList, createUsageMeter, createPieChart, createStatCard, createSpinner,
    createPillGroup, createDefinitionList, openDialog, escapeHtml, createAlertEditor, createInheritField, createCheckbox, createChoiceGroup, alertText, confirmDialog, t
} from './configurationpage?name=storage_common.js';

export default function (view) {
    'use strict';

    var page = createStoragePage(view, 0, { bind: bind, load: load });
    var Shared = page.shared;

    var list = null;
    var filter = null;
    var disks = [];
    var checkedAt = null;
    var spinner = null;
    var checking = false;

    function el(id) { return view.querySelector('#' + id); }

    // node
    // Builds an element with a class and text.
    //
    // Inputs
    // tag [string]: The element name.
    // cls [string]: The class, or an empty string.
    // text [string]: The text, or an empty string.
    //
    // Output
    // [HTMLElement]: The element.
    function node(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        return e;
    }

    // token
    // Reads one of Base's color tokens, for a chart that takes a color code.
    //
    // Inputs
    // name [string]: The token, such as --base-red-fg.
    //
    // Output
    // [string]: The color.
    function token(name) {
        return getComputedStyle(view).getPropertyValue(name).trim();
    }

    // stateOf
    // The badge text, in title case like the count cards, and color of a disk's state.
    //
    // Inputs
    // disk [object]: One disk from GET Storage/Disks.
    //
    // Output
    // [object]: { label, color }.
    function stateOf(disk) {
        if (disk.State === 'Missing') return { label: t.title('StateMissing'), color: 'pink' };
        if (disk.State === 'Unresponsive') return { label: t.title('StateUnresponsive'), color: 'purple' };
        if (disk.State === 'Unformatted') return { label: t.title('StateUnformatted'), color: 'blue' };
        if (disk.State === 'NotMounted') return { label: t.title('StateNotMounted'), color: 'gray' };
        if (disk.Health === 'Failing') return { label: t.title('HealthFailing'), color: 'red' };
        if (disk.Level === 'Error') return { label: t.title('LevelFull'), color: 'orange' };
        if (disk.Level === 'Warning') return { label: t.title('LevelLow'), color: 'yellow' };
        if (!disk.InUse) return { label: t.title('StateUnused'), color: 'gray' };
        return { label: t.title('LabelAvailable'), color: 'green' };
    }

    // nameOf
    // The name shown for a disk. The system disk's mount point says little, so it reads System.
    //
    // Inputs
    // disk [object]: One disk from GET Storage/Disks.
    //
    // Output
    // [string]: The name.
    function nameOf(disk) {
        return disk.IsSystem ? t.tr('LabelSystem') : disk.Name;
    }

    // isRead
    // Tells whether a disk was read, so its space is known.
    //
    // Inputs
    // disk [object]: One disk from GET Storage/Disks.
    //
    // Output
    // [boolean]: true when its size and free space are known.
    function isRead(disk) {
        return disk.State === 'Available' && !!disk.TotalBytes;
    }

    // typeOf
    // The tag for what kind of disk it is: the system disk, a network share, an external disk, or a local one.
    //
    // Inputs
    // disk [object]: One disk from GET Storage/Disks.
    //
    // Output
    // [object]: { label, icon, color } for a record list tag.
    function typeOf(disk) {
        if (disk.IsSystem) return { label: t.tr('LabelSystem'), icon: 'computer', color: 'gray' };
        if (disk.Kind === 'Share') return { label: t.tr('StorageType.Network'), icon: 'lan', color: 'purple' };
        if (disk.Kind === 'External') return { label: t.tr('External'), icon: 'usb', color: 'blue' };
        return { label: t.tr('KindLocal'), icon: 'storage', color: 'teal' };
    }

    // meterOptions
    // A usage meter for a disk, turning orange and red at the disk's own Warning and Error stops.
    //
    // Inputs
    // disk [object]: One disk from GET Storage/Disks.
    //
    // Output
    // [object]: The options for createUsageMeter.
    function meterOptions(disk) {
        var options = { bytes: true, used: disk.TotalBytes - disk.FreeBytes, total: disk.TotalBytes, warning: 101, danger: 101 };
        if (disk.WarningPercent !== null && disk.WarningPercent !== undefined) options.warning = disk.WarningPercent;
        if (disk.ErrorPercent !== null && disk.ErrorPercent !== undefined) options.danger = disk.ErrorPercent;
        return options;
    }

    // asideOf
    // The end of a disk's row: its state badge, and a usage meter when the disk was read.
    //
    // Inputs
    // disk [object]: One disk from GET Storage/Disks.
    //
    // Output
    // [HTMLElement]: The aside.
    function asideOf(disk) {
        var aside = node('div', 'storage-disk-aside', '');
        var state = stateOf(disk);
        aside.insertAdjacentHTML('beforeend', Shared.badge(state.color, state.label));
        if (isRead(disk)) aside.appendChild(createUsageMeter(meterOptions(disk)).element);
        return aside;
    }

    // itemOf
    // A disk as a record list row: its name, path, type, and any missing folders, with its status and space at the end.
    //
    // Inputs
    // disk [object]: One disk from GET Storage/Disks.
    //
    // Output
    // [object]: The row.
    function itemOf(disk) {
        var tags = [typeOf(disk)];
        var gone = disk.MissingFolders.length;
        if (gone) {
            tags.push({ label: gone === 1 ? t.tr('FolderMissing') : t.format('FoldersMissing', gone), icon: 'folder_off', color: 'orange' });
        }
        if (disk.Hot) tags.push({ label: t.tr('AlertHot'), icon: 'thermostat', color: 'red' });
        if (disk.Worn) tags.push({ label: t.tr('AlertWorn'), icon: 'battery_alert', color: 'yellow' });
        // A disk with nothing mounted has no mount point, so its device and size say which one it is.
        var unmounted = disk.State === 'Unformatted' || disk.State === 'NotMounted';
        var secondary = unmounted
            ? [disk.Device, disk.TotalBytes ? Shared.formatSize(disk.TotalBytes) : null].filter(Boolean).join(' · ')
            : disk.MountPoint;
        if (disk.MissingSinceUtc) secondary += ' · ' + t.format('MissingSince', Shared.formatRelativeTime(new Date(disk.MissingSinceUtc)));
        return { id: disk.MountPoint || disk.Device, title: nameOf(disk), secondary: secondary, tags: tags, aside: asideOf(disk), disk: disk };
    }

    // alertCard
    // One alert as a stat card in the alert's color: the used space at which it fires on this disk, such as 103.14 TB,
    // labeled with the alert as set, such as Warning · 90% used, so it is as tall as the other cards.
    //
    // Inputs
    // cards [HTMLElement]: The row of cards.
    // disk [object]: A disk that was read.
    // stop [object|null]: { Value, Unit } of the alert as set, or null when it is off.
    // percent [number|null]: The share in use at which it fires on this disk.
    // color [string]: The card color.
    // name [string]: The alert's name.
    function alertCard(cards, disk, stop, percent, color, name) {
        if (!stop || percent === null || percent === undefined) return;
        var value = Math.round(stop.Value * 10) / 10;
        var setting = stop.Unit === 'Gigabytes' ? t.format('StopGigabytesFree', value) : t.format('StopPercentUsed', value);
        cards.appendChild(createStatCard({
            layout: 'label-top',
            label: name + ' · ' + setting,
            value: Shared.formatSize(Math.round(disk.TotalBytes * percent / 100)),
            color: color
        }).element);
    }

    // spaceSection
    // The dialog's space: a pie chart of used and free space beside Size, Used, and Free cards, with the Storage low
    // and Storage full cards on a row below them.
    //
    // Inputs
    // disk [object]: A disk that was read.
    //
    // Output
    // [HTMLElement]: The section.
    function spaceSection(disk) {
        var used = disk.TotalBytes - disk.FreeBytes;
        var percent = Math.round(used * 100 / disk.TotalBytes);
        var usedColor = disk.Level === 'Error' ? token('--base-red-fg') : disk.Level === 'Warning' ? token('--base-yellow-fg') : token('--base-blue-fg');
        var section = node('div', 'storage-dialog-space', '');
        section.appendChild(createPieChart({
            label: t.tr('LabelSpace'),
            donut: true,
            size: 'medium',
            showLegend: false,
            centerText: percent + '%',
            centerLabel: t.tr('LabelUsed'),
            format: function (value) { return Shared.formatSize(value); },
            slices: [
                { label: t.tr('LabelUsed'), value: used, color: usedColor },
                { label: t.tr('LabelFree'), value: disk.FreeBytes, color: token('--base-gray-fg') }
            ]
        }).element);

        var figures = node('div', 'storage-dialog-figures', '');
        var cards = node('div', 'base-cards', '');
        var freeColor = disk.Level === 'Error' ? 'red' : disk.Level === 'Warning' ? 'yellow' : 'green';
        cards.appendChild(createStatCard({ layout: 'label-top', label: t.tr('LabelSize'), value: Shared.formatSize(disk.TotalBytes) }).element);
        cards.appendChild(createStatCard({ layout: 'label-top', label: t.tr('LabelUsed'), value: Shared.formatSize(used) }).element);
        cards.appendChild(createStatCard({ layout: 'label-top', label: t.tr('LabelFree'), value: Shared.formatSize(disk.FreeBytes), valueColor: freeColor }).element);
        figures.appendChild(cards);

        // The alerts sit on their own row, which is left out while both are off.
        var alerts = node('div', 'base-cards', '');
        alertCard(alerts, disk, disk.WarningStop, disk.WarningPercent, 'yellow', t.tr('AlertLow'));
        alertCard(alerts, disk, disk.ErrorStop, disk.ErrorPercent, 'red', t.tr('AlertFull'));
        if (alerts.children.length) figures.appendChild(alerts);
        section.appendChild(figures);
        return section;
    }

    // librariesSection
    // The dialog's libraries, one tag each.
    //
    // Inputs
    // disk [object]: One disk from GET Storage/Disks.
    //
    // Output
    // [HTMLElement]: The section.
    function librariesSection(disk) {
        var section = node('div', 'storage-dialog-section', '');
        section.appendChild(node('h3', 'base-subsection-title', t.tr('HeaderLibraries')));
        var tags = node('div', 'base-tags', '');
        disk.Libraries.forEach(function (l) { tags.appendChild(node('span', 'base-tag base-tag-pill', l.Name)); });
        section.appendChild(tags);
        return section;
    }

    // foldersSection
    // The dialog's folders as a table: whether each was found, the folder, and its library.
    //
    // Inputs
    // disk [object]: One disk from GET Storage/Disks.
    //
    // Output
    // [HTMLElement]: The section.
    function foldersSection(disk) {
        var section = node('div', 'storage-dialog-section', '');
        section.appendChild(node('h3', 'base-subsection-title', t.tr('Folders')));
        var gone = disk.State !== 'Available';
        var rows = disk.Folders.map(function (folder) {
            var missing = gone || disk.MissingFolders.indexOf(folder.Path) >= 0;
            var readOnly = (disk.ReadOnlyFolders || []).indexOf(folder.Path) >= 0;
            var badge = missing ? Shared.badge('orange', t.tr('FolderNotFound'))
                : readOnly ? Shared.badge('yellow', t.title('FolderReadOnly'))
                : Shared.badge('green', t.tr('FolderFound'));
            // One of Jellyfin's own folders is named as the dashboard names it, such as Cache.
            var owner = folder.Server ? t.tr(folder.Library) : folder.Library;
            return '<tr><td>' + badge + '</td><td class="base-mono">' + escapeHtml(folder.Path) + '</td><td>' + escapeHtml(owner) + '</td></tr>';
        }).join('');
        var wrap = node('div', 'base-static-table-scroll', '');
        wrap.innerHTML = '<table class="base-static-table"><thead><tr><th>' + escapeHtml(t.tr('LabelStatus')) + '</th><th>'
            + escapeHtml(t.tr('LabelFolder')) + '</th><th>' + escapeHtml(t.tr('ColumnLibrary')) + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
        section.appendChild(wrap);
        return section;
    }

    // alertsSection
    // The dialog's full disk alerts: the global ones, or the disk's own once Override is chosen, with Save. Saving
    // closes the dialog and checks the disks again, so the list and the dialog show the alerts in use.
    //
    // Inputs
    // disk [object]: A disk with a mount point.
    // close [function]: Closes the dialog.
    //
    // Output
    // [HTMLElement]: The section, filled once the settings load.
    function alertsSection(disk, close) {
        var section = node('div', 'storage-dialog-section storage-dialog-alerts', '');
        section.appendChild(node('h3', 'base-subsection-title', t.tr('Alerts')));
        Shared.getConfig().then(function (config) {
            var globals = {
                WarningStop: config.WarningStop || { Enabled: true, Value: 90, Unit: 'Percent' },
                ErrorStop: config.ErrorStop || { Enabled: true, Value: 95, Unit: 'Percent' }
            };
            var own = (config.DiskOverrides || []).filter(function (o) { return o.MountPoint === disk.MountPoint; })[0];
            var editor = createAlertEditor({ heading: false, onChange: changed });
            var field = createInheritField({
                field: editor,
                inheritedValue: globals,
                inheritedText: alertText(globals),
                value: { inherit: !own, value: own ? { WarningStop: own.WarningStop, ErrorStop: own.ErrorStop } : globals },
                label: t.tr('Alerts'),
                onChange: changed
            });
            // A large checkbox, like the alerts' own, switches between the global alerts and the disk's own.
            var toggle = createCheckbox({
                label: t.tr('LabelOwnAlerts'),
                description: t.tr('HelpOwnAlerts'),
                size: 'large',
                checked: !!own,
                onChange: function (on) {
                    field.setValue({ inherit: !on });
                    changed();
                }
            });
            section.appendChild(toggle.element);
            section.appendChild(field.element);

            var row = node('div', 'storage-dialog-actions', '');
            var problem = node('div', 'base-error hidden', '');
            var button = node('button', 'raised button-submit base-button', t.tr('Save', 'Save'));
            button.type = 'button';
            button.disabled = true;
            row.appendChild(problem);
            row.appendChild(button);
            section.appendChild(row);
            var start = JSON.stringify(field.getValue());

            // Save shows only once the alerts differ from what was saved.
            function changed() {
                var same = JSON.stringify(field.getValue()) === start;
                button.disabled = same;
                row.classList.toggle('hidden', same && problem.classList.contains('hidden'));
            }
            changed();

            button.addEventListener('click', function () {
                var value = field.getValue();
                var error = value.inherit ? '' : editor.errorText();
                problem.textContent = error;
                problem.classList.toggle('hidden', !error);
                if (error) return;
                button.disabled = true;
                Shared.saveConfigWith(function (latest) {
                    var rest = (latest.DiskOverrides || []).filter(function (o) { return o.MountPoint !== disk.MountPoint; });
                    if (!value.inherit) rest.push({ MountPoint: disk.MountPoint, WarningStop: value.value.WarningStop, ErrorStop: value.value.ErrorStop });
                    latest.DiskOverrides = rest;
                }).then(function () {
                    close();
                    check();
                }).catch(function (err) {
                    button.disabled = false;
                    return Shared.errorText(err, t.tr('ErrorSaveSettings')).then(function (text) {
                        problem.textContent = text;
                        problem.classList.remove('hidden');
                    });
                });
            });
        }).catch(function () {
            section.appendChild(node('div', 'base-error', t.tr('ErrorLoadSettings')));
        });
        return section;
    }

    // FILE_SYSTEM_HELP
    // The string that says what each file system the server can offer is best for, by its name on the server.
    var FILE_SYSTEM_HELP = {
        ext4: 'HelpFsExt4',
        xfs: 'HelpFsXfs',
        btrfs: 'HelpFsBtrfs',
        exfat: 'HelpFsExfat',
        ntfs: 'HelpFsNtfs',
        apfs: 'HelpFsApfs'
    };

    // fileSystemName
    // Spells a file system as its makers do, such as exFAT or HFS+.
    //
    // Inputs
    // value [string]: The file system as the server names it, such as exfat.
    //
    // Output
    // [string]: The name.
    function fileSystemName(value) {
        return t.named(value);
    }

    // formatSection
    // The dialog's format form for an unformatted disk: its new name, its file system, and an optional library, with
    // where it will be mounted. Format asks for the disk's name to be typed first, since it erases the disk. Once it
    // is done the dialog closes and the disks are checked again.
    //
    // Inputs
    // disk [object]: An unformatted disk.
    // close [function]: Closes the dialog.
    //
    // Output
    // [HTMLElement]: The section, filled once the options and libraries load.
    function formatSection(disk, close) {
        var section = node('div', 'storage-dialog-section', '');
        section.appendChild(node('h3', 'base-subsection-title', t.tr('HeaderFormat')));
        Promise.all([
            Shared.apiRequest('Storage/Format', 'GET'),
            ApiClient.getVirtualFolders().catch(function () { return []; })
        ]).then(function (loaded) {
            var options = loaded[0] || {};
            // Collections is a folder Jellyfin keeps for itself, not a library to put media in.
            var libraries = (loaded[1] || []).filter(function (l) { return l.CollectionType !== 'boxsets'; })
                .map(function (l) { return l.Name; }).filter(Boolean).sort();
            var systems = options.FileSystems || [];
            if (!systems.length) {
                section.appendChild(node('div', 'base-info', t.tr('NoticeFormatUnavailable')));
                return;
            }

            // Name
            // Jellyfin's inputs set themselves up from markup, as the dashboard's own pages build them.
            var nameField = node('div', 'base-field', '');
            nameField.innerHTML = '<label for="storageFormatName">' + escapeHtml(t.tr('Name')) + '</label>'
                + '<input is="emby-input" type="text" id="storageFormatName" maxlength="11" value="Media" />'
                + '<div class="fieldDescription">' + escapeHtml(t.tr('HelpVolumeName')) + '</div>';
            section.appendChild(nameField);
            var input = nameField.querySelector('input');

            // File system
            // One card per file system, each saying what it is best for, like the scan choices on the Settings tab.
            var systemField = node('div', 'base-field', '');
            systemField.appendChild(node('label', '', t.tr('LabelFileSystem')));
            var choices = node('div', 'base-choice-group', '');
            choices.setAttribute('role', 'radiogroup');
            choices.setAttribute('aria-label', t.tr('LabelFileSystem'));
            choices.innerHTML = systems.map(function (value) {
                return '<label class="base-choice"><input type="radio" name="storageFormatSystem" value="' + escapeHtml(value) + '" />'
                    + '<span class="base-choice-name">' + escapeHtml(fileSystemName(value)) + '</span>'
                    + '<span class="base-choice-text">' + escapeHtml(t.tr(FILE_SYSTEM_HELP[value] || '', '')) + '</span></label>';
            }).join('');
            systemField.appendChild(choices);
            section.appendChild(systemField);
            var system = createChoiceGroup(choices, {});
            system.set(systems[0]);

            // Library
            var libraryField = node('div', 'selectContainer', '');
            libraryField.innerHTML = '<label class="selectLabel" for="storageFormatLibrary">' + escapeHtml(t.tr('LabelAddToLibrary')) + '</label>'
                + '<select is="emby-select" id="storageFormatLibrary"><option value="">' + escapeHtml(t.tr('None', 'None')) + '</option>'
                + libraries.map(function (name) { return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>'; }).join('')
                + '</select>';
            section.appendChild(libraryField);
            var select = libraryField.querySelector('select');

            // Where it will be mounted, which follows the name.
            var where = node('div', 'base-warn', '');
            section.appendChild(where);
            function mountPoint() {
                var name = input.value.trim();
                return options.MountRoot ? options.MountRoot + '/' + (options.DashesForSpaces ? name.replace(/ /g, '-') : name) : '';
            }
            function describe() {
                where.textContent = options.MountRoot ? t.format('NoticeFormatMountAt', mountPoint()) : t.tr('NoticeFormatDriveLetter');
            }
            input.addEventListener('input', describe);
            describe();

            var row = node('div', 'storage-dialog-actions', '');
            var problem = node('div', 'base-error hidden', '');
            // A disk that holds data is erased first, so the button says so and the device name must be typed.
            var erase = disk.State === 'NotMounted';
            var action = t.tr(erase ? 'ButtonEraseFormat' : 'ButtonFormatDisk');
            var button = node('button', 'raised base-button destructive', action);
            button.type = 'button';
            row.appendChild(problem);
            row.appendChild(button);
            section.appendChild(row);

            function fail(text) {
                problem.textContent = text;
                problem.classList.toggle('hidden', !text);
            }

            button.addEventListener('click', function () {
                var name = input.value.trim();
                if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,10}$/.test(name)) {
                    fail(t.tr('ErrorFormatName'));
                    return;
                }
                fail('');
                var label = disk.Model || disk.Device;
                var device = String(disk.Device).replace(/^\/dev\//, '');
                var message = erase
                    ? t.format('ConfirmErase', label, fileSystemName(system.get()), (disk.Contents || []).join(', '))
                    : t.format('ConfirmFormat', label, fileSystemName(system.get()));
                var typed = erase ? device : name;
                confirmDialog(message, {
                    title: action,
                    // One short word, so the button stays on one line beside Cancel.
                    confirmText: t.tr(erase ? 'ButtonErase' : 'HeaderFormat'),
                    destructive: true,
                    typeToConfirm: typed,
                    typeLabel: t.format('LabelTypeToConfirm', typed)
                }).then(function (yes) {
                    if (!yes) return;
                    button.disabled = true;
                    button.textContent = t.tr('StatusFormatting');
                    return Shared.apiRequest('Storage/Format', 'POST', {
                        Device: disk.Device,
                        Name: name,
                        FileSystem: system.get(),
                        Erase: erase,
                        Library: select.value || null
                    }).then(function (outcome) {
                        if (outcome && outcome.Formatted && outcome.ErrorKey) {
                            // Formatted and mounted, but the library refused the folder, so the dialog stays to say so.
                            check();
                            fail(t.tr(outcome.ErrorKey));
                            return;
                        }
                        if (outcome && outcome.Formatted) {
                            close();
                            check();
                            return;
                        }
                        fail(outcome && outcome.ErrorKey ? t.tr(outcome.ErrorKey) : t.format('ErrorFormatFailed', (outcome && outcome.Error) || ''));
                    });
                }).catch(function (err) {
                    // Base reads the server's reply for its message, which takes a moment.
                    return Shared.errorText(err, t.tr('ErrorFormatRequest')).then(fail);
                }).then(function () {
                    button.disabled = false;
                    button.textContent = action;
                });
            });
        }).catch(function () {
            section.appendChild(node('div', 'base-error', t.tr('ErrorLoadFormat')));
        });
        return section;
    }

    // addressSection
    // The dialog's share address: where the share is mounted from, so a missing share can be mounted again. It is
    // filled in once the plugin has seen the share mounted, and can be set by hand for one it never saw. Saving
    // closes the dialog and checks the disks again, which remounts the share when it is missing.
    //
    // Inputs
    // disk [object]: A disk in use whose address can be set.
    // close [function]: Closes the dialog.
    //
    // Output
    // [HTMLElement]: The section.
    function addressSection(disk, close) {
        var windows = /^[A-Za-z]:|^\\\\/.test(disk.MountPoint);
        var section = node('div', 'storage-dialog-section', '');
        section.appendChild(node('h3', 'base-subsection-title', t.tr('HeaderShareAddress')));
        // Jellyfin's inputs set themselves up from markup, as the dashboard's own pages build them.
        var field = node('div', 'base-field', '');
        field.innerHTML = '<input is="emby-input" type="text" class="base-mono" spellcheck="false" />'
            + '<div class="fieldDescription">' + escapeHtml(t.tr(windows ? 'HelpShareAddressWindows' : 'HelpShareAddress')) + '</div>';
        section.appendChild(field);
        var input = field.querySelector('input');
        input.value = disk.ShareAddress || '';
        input.placeholder = windows ? '\\\\nas\\Media' : 'smb://nas/Media';
        input.setAttribute('aria-label', t.tr('HeaderShareAddress'));

        var row = node('div', 'storage-dialog-actions hidden', '');
        var problem = node('div', 'base-error hidden', '');
        var button = node('button', 'raised button-submit base-button', t.tr('Save', 'Save'));
        button.type = 'button';
        row.appendChild(problem);
        row.appendChild(button);
        section.appendChild(row);

        var start = input.value.trim();
        input.addEventListener('input', function () {
            row.classList.toggle('hidden', input.value.trim() === start && problem.classList.contains('hidden'));
        });
        button.addEventListener('click', function () {
            var address = input.value.trim();
            button.disabled = true;
            Shared.saveConfigWith(function (latest) {
                var rest = (latest.ShareAddresses || []).filter(function (a) { return a.MountPoint !== disk.MountPoint; });
                if (address) rest.push({ MountPoint: disk.MountPoint, Address: address });
                latest.ShareAddresses = rest;
            }).then(function () {
                close();
                check();
            }).catch(function (err) {
                button.disabled = false;
                return Shared.errorText(err, t.tr('ErrorSaveSettings')).then(function (text) {
                    problem.textContent = text;
                    problem.classList.remove('hidden');
                });
            });
        });
        return section;
    }

    // newFolderSection
    // The dialog's New folder form: a name, made at the top of the disk, and an optional library to add it to. Once it
    // is made the dialog closes and the disks are checked again, so the folder shows under its library.
    //
    // Inputs
    // disk [object]: A mounted disk.
    // close [function]: Closes the dialog.
    //
    // Output
    // [HTMLElement]: The section, filled once the libraries load.
    function newFolderSection(disk, close) {
        var section = node('div', 'storage-dialog-section', '');
        section.appendChild(node('h3', 'base-subsection-title', t.tr('HeaderNewFolder')));
        ApiClient.getVirtualFolders().catch(function () { return []; }).then(function (found) {
            // Collections is a folder Jellyfin keeps for itself, not a library to put media in.
            var libraries = (found || []).filter(function (l) { return l.CollectionType !== 'boxsets'; })
                .map(function (l) { return l.Name; }).filter(Boolean).sort();
            var id = 'storageFolder' + Math.random().toString(36).slice(2, 8);

            // Jellyfin's inputs set themselves up from markup, as the dashboard's own pages build them.
            var fields = node('div', 'base-field-row storage-folder-fields', '');
            fields.innerHTML = '<div class="base-field"><label for="' + id + 'Name">' + escapeHtml(t.tr('LabelFolderName')) + '</label>'
                + '<input is="emby-input" type="text" id="' + id + 'Name" maxlength="100" />'
                + '<div class="fieldDescription">' + escapeHtml(t.tr('HelpFolderName')) + '</div></div>'
                + '<div class="selectContainer"><label class="selectLabel" for="' + id + 'Library">' + escapeHtml(t.tr('LabelAddToLibrary')) + '</label>'
                + '<select is="emby-select" id="' + id + 'Library"><option value="">' + escapeHtml(t.tr('None', 'None')) + '</option>'
                + libraries.map(function (name) { return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>'; }).join('')
                + '</select></div>';
            section.appendChild(fields);
            var input = fields.querySelector('input');
            var select = fields.querySelector('select');

            var row = node('div', 'storage-dialog-actions', '');
            var problem = node('div', 'base-error hidden', '');
            var button = node('button', 'raised button-submit base-button', t.tr('ButtonCreateFolder'));
            button.type = 'button';
            row.appendChild(problem);
            row.appendChild(button);
            section.appendChild(row);

            function fail(text) {
                problem.textContent = text;
                problem.classList.toggle('hidden', !text);
            }

            button.addEventListener('click', function () {
                var name = input.value.trim();
                if (!name || /[\\/:*?"<>|]/.test(name) || name === '.' || name === '..' || /\.$/.test(name)) {
                    fail(t.tr('ErrorFolderName'));
                    return;
                }
                fail('');
                button.disabled = true;
                Shared.apiRequest('Storage/Folders', 'POST', { MountPoint: disk.MountPoint, Name: name, Library: select.value || null }).then(function (outcome) {
                    if (outcome && outcome.Created && outcome.ErrorKey) {
                        // Made, but the library refused it, so the dialog stays to say so.
                        check();
                        fail(t.tr(outcome.ErrorKey));
                        return;
                    }
                    if (outcome && outcome.Created) {
                        close();
                        check();
                        return;
                    }
                    fail(outcome && outcome.ErrorKey ? t.tr(outcome.ErrorKey) : t.format('ErrorFolderFailed', (outcome && outcome.Error) || ''));
                }).catch(function (err) {
                    return Shared.errorText(err, t.tr('ErrorFolderRequest')).then(fail);
                }).then(function () {
                    button.disabled = false;
                });
            });
        }).catch(function () {
            section.appendChild(node('div', 'base-error', t.tr('ErrorFolderRequest')));
        });
        return section;
    }

    // libraryMount
    // Tells whether a folder is where a library expects one of its disks.
    //
    // Inputs
    // path [string|null]: The folder.
    //
    // Output
    // [boolean]: true when a disk the libraries use mounts there.
    function libraryMount(path) {
        return !!path && disks.some(function (d) { return d.InUse && d.MountPoint === path; });
    }

    // healthFacts
    // What a disk's SMART data says, for the dialog: its health as a badge first, then its temperature, power-on time,
    // and wear when it reports them. A disk with no SMART data, such as a share, shows none.
    //
    // Inputs
    // disk [object]: One disk from GET Storage/Disks.
    //
    // Output
    // [Array]: Definition list items.
    function healthFacts(disk) {
        if (!disk.Health || disk.Health === 'Unknown') return [];
        var good = disk.Health === 'Good';
        var facts = [{ label: t.tr('LabelHealth'), value: { badge: { label: t.title(good ? 'HealthGood' : 'HealthFailing'), color: good ? 'green' : 'red' } } }];
        if (disk.TemperatureCelsius !== null && disk.TemperatureCelsius !== undefined) {
            // Red past the Too hot alert, as the row's tag says.
            var celsius = t.format('ValueCelsius', disk.TemperatureCelsius);
            facts.push({ label: t.tr('LabelTemperature'), value: disk.Hot ? node('span', 'storage-level-red', celsius) : celsius });
        }
        if (disk.PowerOnHours) facts.push({ label: t.tr('LabelPowerOnTime'), value: t.format('DurationHours', disk.PowerOnHours.toLocaleString()) });
        if (disk.WearPercent !== null && disk.WearPercent !== undefined) {
            // Green while most of the rated writes are left, yellow past half, red past the Worn out alert, like Free.
            var wearColor = disk.Worn ? 'red' : disk.WearPercent >= 50 ? 'yellow' : 'green';
            facts.push({ label: t.tr('LabelWear'), value: node('span', 'storage-level-' + wearColor, t.format('ValueWear', disk.WearPercent)) });
        }
        return facts;
    }

    // openDisk
    // Opens a dialog with one disk's state, space, stops, libraries, and folders.
    //
    // Inputs
    // disk [object]: One disk from GET Storage/Disks.
    function openDisk(disk) {
        var body = node('div', 'storage-dialog', '');
        var state = stateOf(disk);
        var type = typeOf(disk);
        // The badges lead, then what kind of disk it is, where it is, and its SMART readings, so the facts read in
        // that order on a phone, where they stack, as well as across the columns.
        var health = healthFacts(disk);
        var facts = [{ label: t.tr('LabelStatus'), value: { badge: { label: state.label, color: state.color } } }];
        if (health.length) facts.push(health.shift());
        facts.push({ label: t.tr('LabelType'), value: type.label });
        if (disk.FileSystem) facts.push({ label: t.tr('LabelFileSystem'), value: t.named(disk.FileSystem) });
        if ((disk.State === 'Unformatted' || disk.State === 'NotMounted') && disk.TotalBytes) facts.push({ label: t.tr('LabelSize'), value: Shared.formatSize(disk.TotalBytes) });
        if (disk.Contents && disk.Contents.length) facts.push({ label: t.tr('LabelHolds'), value: disk.Contents.join(', ') });
        if (disk.MountsAt) facts.push({ label: t.tr('LabelMountsAt'), value: disk.MountsAt, mono: true });
        if (disk.MountPoint) facts.push({ label: t.tr('LabelMountPoint'), value: disk.MountPoint, mono: true });
        if (disk.Device) facts.push({ label: t.tr('LabelDevice'), value: disk.Device, mono: true });
        if (disk.Model) facts.push({ label: t.tr('LabelModel'), value: disk.Model });
        health.forEach(function (fact) { facts.push(fact); });
        body.appendChild(createDefinitionList({ layout: 'columns', items: facts }).element);

        if (isRead(disk)) {
            body.appendChild(spaceSection(disk));
        } else if (disk.MissingSinceUtc) {
            var key = disk.State === 'Missing' ? 'NoticeDiskMissingSince' : 'NoticeDiskUnresponsiveSince';
            body.appendChild(node('div', 'base-error', t.format(key, Shared.formatDate(disk.MissingSinceUtc))));
        }

        var dialog = null;
        var close = function () { if (dialog) dialog.close(); };
        if (disk.State === 'Unformatted') {
            body.appendChild(node('div', 'base-info', t.tr('NoticeDiskUnformatted')));
            body.appendChild(formatSection(disk, close));
        } else if (disk.State === 'NotMounted' && libraryMount(disk.MountsAt)) {
            // A library's own disk, dropped off its mount point, is mounted again rather than erased.
            body.appendChild(node('div', 'base-error', t.format('NoticeLibraryDisk', disk.MountsAt)));
        } else if (disk.State === 'NotMounted') {
            body.appendChild(node('div', 'base-warn', t.tr('NoticeDiskNotMounted')));
            body.appendChild(formatSection(disk, close));
        } else if (disk.InUse) {
            // A share, or a disk gone missing, can be given the address it is mounted from.
            if (disk.TakesAddress && (disk.Kind === 'Share' || disk.State !== 'Available')) body.appendChild(addressSection(disk, close));
            body.appendChild(alertsSection(disk, close));
            if (disk.Libraries.length) body.appendChild(librariesSection(disk));
            body.appendChild(foldersSection(disk));
            if (disk.State === 'Available') body.appendChild(newFolderSection(disk, close));
        } else {
            body.appendChild(alertsSection(disk, close));
            body.appendChild(node('div', 'base-info', t.tr('NoticeDiskUnused')));
            body.appendChild(newFolderSection(disk, close));
        }

        dialog = openDialog({ title: nameOf(disk), size: 'large', body: body, page: page });
    }

    // issuesOf
    // What needs a look on a disk the libraries use, most serious first, each as one sentence.
    //
    // Inputs
    // disk [object]: A disk in use.
    //
    // Output
    // [Array]: { text, serious } for each problem, serious being true for what needs a look now.
    function issuesOf(disk) {
        var name = nameOf(disk);
        var issues = [];
        if (disk.State === 'Missing') {
            var since = disk.MissingSinceUtc ? Shared.formatRelativeTime(new Date(disk.MissingSinceUtc)) : '';
            issues.push({ text: t.format('IssueMissing', name, since), serious: true });
        } else if (disk.State === 'Unresponsive') {
            issues.push({ text: t.format('IssueUnresponsive', name), serious: true });
        }
        if (disk.State !== 'Available') return issues;
        var used = disk.TotalBytes ? Math.round((disk.TotalBytes - disk.FreeBytes) * 100 / disk.TotalBytes) : 0;
        if (disk.Health === 'Failing') issues.push({ text: t.format('IssueFailing', name), serious: true });
        if (disk.Level === 'Error') issues.push({ text: t.format('IssueFull', name, used, Shared.formatSize(disk.FreeBytes)), serious: true });
        if (disk.Level === 'Warning') issues.push({ text: t.format('IssueLow', name, used, Shared.formatSize(disk.FreeBytes)), serious: false });
        if (disk.Hot) issues.push({ text: t.format('IssueHot', name, disk.TemperatureCelsius), serious: false });
        if (disk.Worn) issues.push({ text: t.format('IssueWorn', name, disk.WearPercent), serious: false });
        if (disk.MissingFolders.length) issues.push({ text: t.format('IssueFolders', name), serious: false });
        // Jellyfin's own folders it can't write to stop it working, so they come first and red.
        var readOnly = disk.ReadOnlyFolders || [];
        var own = disk.Folders.filter(function (f) { return f.Server && readOnly.indexOf(f.Path) >= 0; });
        own.forEach(function (f) { issues.push({ text: t.format('IssueServerReadOnly', t.tr(f.Library), f.Path), serious: true }); });
        if (readOnly.length > own.length) issues.push({ text: t.format('IssueReadOnly', name), serious: false });
        return issues;
    }

    // renderAttention
    // The banner above the list: one line per problem, red when any needs a look now, else yellow, or one green line
    // when every disk the libraries use is healthy.
    //
    // Inputs
    // used [Array]: The disks in use.
    function renderAttention(used) {
        var banner = el('attention');
        banner.textContent = '';
        var issues = [];
        used.forEach(function (disk) { issues = issues.concat(issuesOf(disk)); });
        if (!issues.length) {
            banner.className = 'base-success';
            banner.textContent = used.length ? t.tr('NoticeAllHealthy') : t.tr('NoticeNoDisks');
            return;
        }
        issues.sort(function (a, b) { return (b.serious ? 1 : 0) - (a.serious ? 1 : 0); });
        banner.className = (issues.some(function (i) { return i.serious; }) ? 'base-error' : 'base-warn') + ' storage-attention';
        if (issues.length === 1) {
            banner.textContent = issues[0].text;
            return;
        }
        var list = node('ul', '', '');
        issues.forEach(function (issue) { list.appendChild(node('li', '', issue.text)); });
        banner.appendChild(list);
    }

    // renderSpace
    // The size, used, and free space of every disk the libraries use that could be read, added up. Free takes the
    // color of the fullest disk's alert.
    //
    // Inputs
    // used [Array]: The disks in use.
    function renderSpace(used) {
        var read = used.filter(isRead);
        var cards = el('spaceCards');
        cards.textContent = '';
        cards.classList.toggle('hidden', !read.length);
        if (!read.length) return;
        var total = read.reduce(function (sum, d) { return sum + d.TotalBytes; }, 0);
        var free = read.reduce(function (sum, d) { return sum + d.FreeBytes; }, 0);
        var level = read.some(function (d) { return d.Level === 'Error'; }) ? 'red' : read.some(function (d) { return d.Level === 'Warning'; }) ? 'yellow' : 'green';
        var detail = read.length === 1 ? t.tr('SpaceOneDisk') : t.format('SpaceDisks', read.length);
        [
            { label: t.tr('LabelSize'), value: Shared.formatSize(total) },
            { label: t.tr('LabelUsed'), value: Shared.formatSize(total - free) },
            { label: t.tr('LabelFree'), value: Shared.formatSize(free), valueColor: level }
        ].forEach(function (card) {
            cards.appendChild(createStatCard({ layout: 'label-top', label: card.label, value: card.value, valueColor: card.valueColor, detail: detail }).element);
        });
    }

    // render
    // Draws the attention banner and the space cards for the disks in use, and the rows the filter shows.
    function render() {
        var used = disks.filter(function (d) { return d.InUse; });
        renderAttention(used);
        renderSpace(used);

        var shown = filter.get() === 'all' ? disks : used;
        list.setItems(shown.map(itemOf));
    }

    // showChecked
    // Remembers when the disks were checked, for the Refresh button's hover, or shows why the check failed.
    //
    // Inputs
    // error [string|null]: The failure, or null after a check that finished.
    function showChecked(error) {
        var status = el('checkStatus');
        status.textContent = error || '';
        status.classList.toggle('hidden', !error);
        if (!error) checkedAt = new Date();
    }

    // setChecking
    // Swaps the Refresh button's icon for a spinner while a check runs, and back when it ends.
    //
    // Inputs
    // busy [boolean]: Whether a check is running.
    function setChecking(busy) {
        var button = el('btnCheckNow');
        button.disabled = busy;
        el('refreshIcon').classList.toggle('hidden', busy);
        if (busy && !spinner) {
            spinner = createSpinner({ size: 'small', label: t.tr('StatusChecking') });
            button.insertBefore(spinner.element, button.firstChild);
        } else if (!busy && spinner) {
            spinner.destroy();
            spinner = null;
        }
    }

    // check
    // Asks the server to check every disk, then draws the result.
    function check() {
        if (checking) return;
        checking = true;
        setChecking(true);
        Shared.apiRequest('Storage/Disks', 'GET').then(function (result) {
            disks = result || [];
            render();
            showChecked(null);
        }).catch(function (err) {
            return Shared.errorText(err, t.tr('ErrorCheckDisks')).then(showChecked);
        }).then(function () {
            checking = false;
            setChecking(false);
        });
    }

    function bind() {
        list = createRecordList({
            label: t.tr('HeaderDisks'),
            emptyText: t.tr('EmptyDisks'),
            onOpen: function (item) { openDisk(item.disk); }
        });
        el('diskList').appendChild(list.element);
        filter = createPillGroup(el('diskFilter'), { onChange: render });
        filter.set('used');
        Shared.bindClick('btnCheckNow', check);
        el('btnCheckNow').addEventListener('mouseenter', function () {
            this.title = checkedAt ? t.format('LastChecked', Shared.formatRelativeTime(checkedAt)) : '';
        });
    }

    function load() {
        check();
    }
}
