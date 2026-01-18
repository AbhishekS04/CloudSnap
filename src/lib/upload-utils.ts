
export async function parseDropEvent(e: React.DragEvent): Promise<{ files: File[]; url: string | null }> {
    e.preventDefault();

    // 1. Check for Files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        return { files: Array.from(e.dataTransfer.files), url: null };
    }

    // 2. Check for URL/HTML drop
    const html = e.dataTransfer.getData('text/html');
    const uriList = e.dataTransfer.getData('text/uri-list');
    const plainText = e.dataTransfer.getData('text/plain');

    let urlToUpload = uriList || plainText;

    // Try extracting from HTML if available
    if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Check for Video/Source/Image
        const video = doc.querySelector('video');
        const source = doc.querySelector('source');
        const img = doc.querySelector('img');

        if (video && video.src) {
            urlToUpload = video.src;
        } else if (source && source.src) {
            urlToUpload = source.src;
        } else if (img && img.src) {
            urlToUpload = img.src;
        }
    }

    // Regex fallback
    if (!urlToUpload && html) {
        const videoUrlMatch = html.match(/https?:\/\/[^\s"']+\.(mp4|webm|mov)(?:\?[^\s"']*)?/i);
        if (videoUrlMatch) {
            urlToUpload = videoUrlMatch[0];
        }
    }

    if (urlToUpload && (urlToUpload.startsWith('http') || urlToUpload.startsWith('https'))) {
        return { files: [], url: urlToUpload };
    }

    return { files: [], url: null };
}
