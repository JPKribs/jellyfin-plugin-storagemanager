using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.Storage.Models;
using Jellyfin.Plugin.Storage.Services;
using JPKribs.Jellyfin.Base;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.Storage.Api;

/// <summary>
/// The dashboard's API. Every route is for administrators only, except the page strings.
/// </summary>
[ApiController]
[Route("Storage")]
[Authorize(Policy = "RequiresElevation")]
public class StorageController : ControllerBase
{
    private readonly StorageService _storage;
    private readonly DiskFormatting _formatting;
    private readonly FolderCreator _folders;

    /// <summary>
    /// Initializes a new instance of the <see cref="StorageController"/> class.
    /// </summary>
    /// <param name="storage">Checks the disks.</param>
    /// <param name="formatting">Formats unformatted disks.</param>
    /// <param name="folders">Makes folders on disks.</param>
    public StorageController(StorageService storage, DiskFormatting formatting, FolderCreator folders)
    {
        _folders = folders;
        ArgumentNullException.ThrowIfNull(storage);
        _storage = storage;
        _formatting = formatting;
    }

    /// <summary>
    /// Gets what formatting offers on this server: the file systems and where a new disk is mounted.
    /// </summary>
    /// <returns>The options.</returns>
    [HttpGet("Format")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<FormatOptions> GetFormatOptions() => Ok(_formatting.Options);

    /// <summary>
    /// Formats an unformatted disk, mounts it, and adds it to a library when one is named. Erases the disk.
    /// </summary>
    /// <param name="request">The disk, its new name and file system, and the library.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>What came of it.</returns>
    [HttpPost("Format")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<FormatOutcome>> Format([FromBody] FormatRequest request, CancellationToken cancellationToken)
        => Ok(await _formatting.FormatAsync(request, cancellationToken).ConfigureAwait(false));

    /// <summary>
    /// Checks every disk and share the libraries use.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>One entry per disk, missing and unresponsive disks first.</returns>
    [HttpGet("Disks")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DiskInfo>>> GetDisks(CancellationToken cancellationToken)
        => Ok(await _storage.CheckAsync(cancellationToken).ConfigureAwait(false));

    /// <summary>
    /// Makes a folder directly on a mounted disk, and adds it to a library when one is named.
    /// </summary>
    /// <param name="request">The disk, the folder's name, and the library.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>What came of it.</returns>
    [HttpPost("Folders")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<FolderOutcome>> CreateFolder([FromBody] FolderRequest request, CancellationToken cancellationToken)
        => Ok(await _folders.CreateAsync(request, cancellationToken).ConfigureAwait(false));

    /// <summary>
    /// Gets the plugin's strings in one language, for the dashboard pages.
    /// </summary>
    /// <param name="language">The language, such as de or pt-br. Leave out for US English.</param>
    /// <returns>The strings by key, or Not Modified when the page already has them.</returns>
    [HttpGet("Translations")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status304NotModified)]
    public IActionResult Translations([FromQuery] string? language)
        => BaseTranslations.Serve(language, Request, Response);
}
