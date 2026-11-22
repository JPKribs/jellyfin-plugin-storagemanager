// A stand-in ApiClient, LibraryMenu, and Dashboard with generic sample data for the Storage doc screenshots.
window.__errs = [];
window.addEventListener('error', function (e) { __errs.push(String(e.message)); });
window.addEventListener('unhandledrejection', function (e) { __errs.push('rejection: ' + String(e.reason && e.reason.stack || e.reason)); });
(function () { var ce = console.error; console.error = function () { __errs.push([].join.call(arguments, ' ')); ce.apply(console, arguments); }; })();

// The plugin's strings come from server.py, which serves them as the plugin's Translations route does.
(function () {
    var real = window.fetch;
    window.fetch = function (url, options) {
        var text = String(url);
        var at = text.indexOf('Storage/Translations');
        return real.call(window, at >= 0 ? '/' + text.slice(at) : url, options);
    };
})();

var USERS = [
    { Id: '3f0c9a1e5b7d4c2a8e6f1b3d5a7c9e01', Name: 'alex', Policy: { IsAdministrator: true } }
];
var config = {
    WarningStop: { Enabled: true, Value: 90, Unit: 'Percent' },
    ErrorStop: { Enabled: true, Value: 95, Unit: 'Percent' },
    DiskOverrides: [{ MountPoint: '/mnt/music', WarningStop: { Enabled: true, Value: 80, Unit: 'Percent' }, ErrorStop: { Enabled: true, Value: 90, Unit: 'Percent' } }],
    ScanGuard: 'Affected',
    HealthAlerts: { Failing: true, Hot: true, HotCelsius: 60, Worn: true, WornPercent: 90 },
    Remount: true,
    MuteMonitoring: true
};
var TB = 1024 * 1024 * 1024 * 1024;
var GB = 1024 * 1024 * 1024;
var disks = [
    { MountPoint: '', Device: '/dev/sda', Name: 'Flash', Model: 'Flash', InUse: false, State: 'NotMounted', Kind: 'Local', TotalBytes: 239 * GB, Level: 'None',
      Contents: ['Debian 13.3.0 amd64 n (iso9660)', 'vfat'], Libraries: [], Folders: [], MissingFolders: [] },
    { MountPoint: '', Device: '/dev/sdb', Name: 'WDC WD80EFZZ', Model: 'WDC WD80EFZZ', InUse: false, State: 'Unformatted', Kind: 'Local', TotalBytes: 8 * TB, Level: 'None',
      Libraries: [], Folders: [], MissingFolders: [] },
    { MountPoint: '/mnt/spare', Name: 'spare', InUse: false, State: 'Available', Kind: 'Local', FileSystem: 'ext4', TotalBytes: 2 * TB, FreeBytes: 1.8 * TB, Level: 'None',
      Libraries: [], Folders: [], MissingFolders: [] },
    { MountPoint: '/mnt/media2', Name: 'media2', InUse: true, State: 'Missing', Kind: 'Local', MissingSinceUtc: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      Libraries: [{ Id: 'l1', Name: 'Anime' }, { Id: 'l2', Name: 'Movies' }], Folders: [{ Path: '/mnt/media2/Anime', Library: 'Anime' }, { Path: '/mnt/media2/Movies', Library: 'Movies' }], MissingFolders: [] },
    { MountPoint: '/mnt/media1', Name: 'media1', InUse: true, State: 'Available', Health: 'Good', TemperatureCelsius: 63, PowerOnHours: 18240, Kind: 'Local', FileSystem: 'ext4', TotalBytes: 11 * TB, FreeBytes: 3.1 * TB,
      Libraries: [{ Id: 'l2', Name: 'Movies' }, { Id: 'l3', Name: 'Shows' }], Folders: [{ Path: '/mnt/media1/Movies', Library: 'Movies' }, { Path: '/mnt/media1/Shows', Library: 'Shows' }], MissingFolders: [], Level: 'None', WarningPercent: 90, ErrorPercent: 95, WarningStop: { Enabled: true, Value: 90, Unit: 'Percent' }, ErrorStop: { Enabled: true, Value: 95, Unit: 'Percent' } },
    { MountPoint: '/mnt/music', Name: 'music', InUse: true, State: 'Available', Kind: 'Share', FileSystem: 'nfs', TotalBytes: 4 * TB, FreeBytes: 0.3 * TB,
      Libraries: [{ Id: 'l4', Name: 'Music' }], Folders: [{ Path: '/mnt/music', Library: 'Music' }], MissingFolders: [], ReadOnlyFolders: ['/mnt/music'], Level: 'Warning', WarningPercent: 90, ErrorPercent: 95, WarningStop: { Enabled: true, Value: 90, Unit: 'Percent' }, ErrorStop: { Enabled: true, Value: 95, Unit: 'Percent' } },
    { MountPoint: '/', Name: '/', IsSystem: true, InUse: true, State: 'Available', Kind: 'Local', FileSystem: 'ext4', TotalBytes: 0.5 * TB, FreeBytes: 0.31 * TB,
      Libraries: [{ Id: 'l5', Name: 'Recordings' }], Folders: [{ Path: '/var/lib/jellyfin/recordings', Library: 'Recordings' }, { Path: '/srv/old', Library: 'Recordings' }, { Path: '/var/lib/jellyfin', Library: 'PathProgramData', Server: true }, { Path: '/var/lib/jellyfin/metadata', Library: 'LabelMetadata', Server: true }, { Path: '/var/cache/jellyfin', Library: 'LabelCache', Server: true }, { Path: '/var/log/jellyfin', Library: 'LabelLogs', Server: true }], MissingFolders: ['/srv/old'], Level: 'None', WarningPercent: 90, ErrorPercent: 95, WarningStop: { Enabled: true, Value: 90, Unit: 'Percent' }, ErrorStop: { Enabled: true, Value: 95, Unit: 'Percent' } }
];

// Windows sample disks, used with ?os=windows: drive letters, a UNC share, and a volume label as each disk's name.
var alerts = { WarningStop: { Enabled: true, Value: 90, Unit: 'Percent' }, ErrorStop: { Enabled: true, Value: 95, Unit: 'Percent' }, WarningPercent: 90, ErrorPercent: 95 };
var windowsDisks = [
    Object.assign({ MountPoint: 'F:\\', Name: 'Archive', InUse: true, State: 'Missing', Kind: 'Local', Level: 'None', MissingSinceUtc: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
      Libraries: [{ Id: 'w1', Name: 'Old Movies' }], Folders: [{ Path: 'F:\\Old Movies', Library: 'Old Movies' }], MissingFolders: [] }),
    Object.assign({ MountPoint: 'C:\\', Name: 'Windows', IsSystem: true, InUse: true, State: 'Available', Health: 'Good', TemperatureCelsius: 34, PowerOnHours: 2448, WearPercent: 3, Kind: 'Local', FileSystem: 'NTFS', TotalBytes: 476 * GB, FreeBytes: 212 * GB, Level: 'None',
      Libraries: [{ Id: 'w2', Name: 'Recordings' }], Folders: [{ Path: 'C:\\ProgramData\\Jellyfin\\Server\\data\\livetv\\recordings', Library: 'Recordings' }], MissingFolders: [] }, alerts),
    Object.assign({ MountPoint: 'D:\\', Name: 'Media', InUse: true, State: 'Available', Health: 'Failing', TemperatureCelsius: 51, PowerOnHours: 41210, Kind: 'Local', FileSystem: 'NTFS', TotalBytes: 7452 * GB, FreeBytes: 540 * GB, Level: 'Warning',
      Libraries: [{ Id: 'w3', Name: 'Movies' }, { Id: 'w4', Name: 'Shows' }], Folders: [{ Path: 'D:\\Movies', Library: 'Movies' }, { Path: 'D:\\Shows', Library: 'Shows' }], MissingFolders: [] }, alerts),
    Object.assign({ MountPoint: '\\\\nas\\movies', Name: 'movies', InUse: true, State: 'Available', Kind: 'Share', Level: 'None',
      Libraries: [{ Id: 'w3', Name: 'Movies' }], Folders: [{ Path: '\\\\nas\\movies\\4K', Library: 'Movies' }], MissingFolders: [] }),
    Object.assign({ MountPoint: 'E:\\', Name: 'Backup', InUse: false, State: 'Available', Kind: 'Local', FileSystem: 'exFAT', TotalBytes: 1863 * GB, FreeBytes: 1610 * GB, Level: 'None',
      Libraries: [], Folders: [], MissingFolders: [] }, alerts),
    { MountPoint: '', Device: 'Disk 2', Name: 'Samsung SSD 870 EVO', InUse: false, State: 'Unformatted', Kind: 'Local', Model: 'Samsung SSD 870 EVO', TotalBytes: 1863 * GB, Level: 'None',
      Libraries: [], Folders: [], MissingFolders: [] }
];
if (/[?&]os=windows/.test(location.search)) disks = windowsDisks;

// withAlerts
// Sets each read disk's alerts and level from the settings, its own override first, as the server's check does.
function withAlerts(list) {
    return list.map(function (disk) {
        var address = (config.ShareAddresses || []).filter(function (a) { return a.MountPoint === disk.MountPoint; })[0];
        disk = Object.assign({}, disk, { TakesAddress: disk.InUse, ShareAddress: address ? address.Address : (disk.Kind === 'Share' ? 'nfs://nas/music' : null) });
        if (disk.State !== 'Available' || !disk.TotalBytes) return disk;
        var health = config.HealthAlerts || {};
        disk.Hot = !!health.Hot && disk.TemperatureCelsius >= health.HotCelsius;
        disk.Worn = !!health.Worn && disk.WearPercent >= health.WornPercent;
        var own = (config.DiskOverrides || []).filter(function (o) { return o.MountPoint === disk.MountPoint; })[0];
        var warning = own ? own.WarningStop : config.WarningStop;
        var error = own ? own.ErrorStop : config.ErrorStop;
        var at = function (stop) {
            if (!stop || !stop.Enabled) return null;
            var percent = stop.Unit === 'Gigabytes' ? 100 - stop.Value * GB * 100 / disk.TotalBytes : stop.Value;
            return Math.min(100, Math.max(0, percent));
        };
        var used = (disk.TotalBytes - disk.FreeBytes) * 100 / disk.TotalBytes;
        var w = at(warning), e = at(error);
        return Object.assign({}, disk, {
            OwnAlerts: !!own,
            WarningStop: w === null ? null : warning,
            ErrorStop: e === null ? null : error,
            WarningPercent: w,
            ErrorPercent: e,
            Level: e !== null && used >= e ? 'Error' : w !== null && used >= w ? 'Warning' : 'None'
        });
    });
}

window.__saved = [];
function clone(o) { return JSON.parse(JSON.stringify(o)); }
window.ApiClient = {
    serverAddress: function () { return 'https://jellyfin.example.com'; },
    getUrl: function (p) { return 'https://jellyfin.example.com/' + String(p).replace(/^\//, ''); },
    getCurrentUserId: function () { return USERS[0].Id; },
    getPluginConfiguration: function () { return Promise.resolve(clone(config)); },
    updatePluginConfiguration: function (id, c) { window.__saved.push(clone(c)); config = clone(c); return Promise.resolve({}); },
    getUsers: function () { return Promise.resolve(clone(USERS)); },
    getScheduledTasks: function () { return Promise.resolve([]); },
    getJSON: function (url) { return ApiClient.fetch({ url: url, type: 'GET' }); },
    ajax: function (o) { return ApiClient.fetch(o); },
    fetch: function (o) {
        var url = (o && o.url) || '';
        var windows = /[?&]os=windows/.test(location.search);
        if (url.indexOf('Storage/Format') >= 0 && (o.type || 'GET') === 'GET') {
            return Promise.resolve(windows ? { FileSystems: ['ntfs', 'exfat'], MountRoot: null } : { FileSystems: ['ext4', 'xfs', 'exfat'], MountRoot: '/mnt' });
        }
        if (url.indexOf('Storage/Folders') >= 0) {
            var folder = typeof o.data === 'string' ? JSON.parse(o.data) : (o.data || {});
            window.__folder = folder;
            return Promise.resolve({ Created: true, Path: folder.MountPoint + '/' + folder.Name });
        }
        if (url.indexOf('Storage/Format') >= 0) {
            var body = typeof o.data === 'string' ? JSON.parse(o.data) : (o.data || {});
            window.__formatted = body;
            return Promise.resolve({ Formatted: true, MountPoint: '/mnt/' + String(body.Name || '').replace(/ /g, '-') });
        }
        return Promise.resolve(clone(url.indexOf('Storage/Disks') >= 0 ? withAlerts(disks) : {}));
    },
    getVirtualFolders: function () { return Promise.resolve([{ Name: 'Movies' }, { Name: 'Shows' }, { Name: 'Music' }]); },
    getUserImageUrl: function () { return ''; },
    sendMessage: function () {}, sendWebSocketMessage: function () {}
};
window.Dashboard = { alert: function (m) { console.error('Dashboard.alert used: ' + m); }, processPluginConfigurationUpdateResult: function () {}, showLoadingMsg: function () {}, hideLoadingMsg: function () {} };

// Draws the dashboard header and its tabs, as Jellyfin's LibraryMenu.setTabs does for a plugin page.
window.LibraryMenu = {
    setTabs: function (key, index, getTabs) {
        var tabs = typeof getTabs === 'function' ? getTabs() : getTabs;
        var host = document.getElementById('jfTabs');
        if (!host) return;
        host.innerHTML = (tabs || []).map(function (t, i) {
            return '<a class="jfTab' + (i === index ? ' jfTabActive' : '') + '">' + t.name + '</a>';
        }).join('');
    }
};
