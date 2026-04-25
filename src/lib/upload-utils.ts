
export async function parseDropEvent(e: React.DragEvent): Promise<{ files: File[]; url: string | null }> {
    e.preventDefault();

    // 1. Check for Files
    let files: File[] = [];
    if (e.dataTransfer.items) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
            if (e.dataTransfer.items[i].kind === 'file') {
                const file = e.dataTransfer.items[i].getAsFile();
                if (file) files.push(file);
            }
        }
    } else if (e.dataTransfer.files) {
        files = Array.from(e.dataTransfer.files);
    }

    if (files.length > 0) {
        return { files, url: null };
    }

    // 2. Check for URL/HTML drop
    const types = e.dataTransfer.types;
    console.log('[Drop Debug] Available types:', Array.from(types));
    
    const html = e.dataTransfer.getData('text/html');
    const uriList = e.dataTransfer.getData('text/uri-list');
    const plainText = e.dataTransfer.getData('text/plain');
    
    console.log('[Drop Debug] uri-list content:', uriList);
    console.log('[Drop Debug] plainText content:', plainText);

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
