/**
 * Link Parser & Playable URL Intelligence Utility
 * 
 * Handles extracting and categorizing messy comma/space/newline separated URLs
 * from the submission Lapse/Devlog field, and detects Playable URL violations.
 */

import { ParsedLink, PlayableValidation } from './types';

/**
 * Normalizes a URL by stripping trailing slashes, protocol variations (http/https),
 * and standardizing github URL fragments.
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  return url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

/**
 * Extracts raw URLs from an unformatted user text block (e.g. comma-separated,
 * space-separated, mixed markdown links, or multiline).
 */
export function extractRawUrls(inputText: string): string[] {
  if (!inputText || !inputText.trim()) return [];

  // Match URLs starting with http://, https://, or common host patterns
  const urlRegex = /(https?:\/\/[^\s,;<>()[\]]+|www\.[^\s,;<>()[\]]+)/gi;
  const matches = inputText.match(urlRegex) || [];

  // Strip trailing punctuation often accidentally included (commas, periods, brackets)
  const cleanedUrls = matches.map((u) => {
    let clean = u.replace(/[.,;:)\]]+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    return clean;
  });

  // Return unique URLs
  return Array.from(new Set(cleanedUrls));
}

/**
 * Converts a YouTube URL into a safe privacy-enhanced embed URL
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      const videoId = parsed.pathname.slice(1);
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.includes('/embed/')) return url;
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
      if (parsed.pathname.startsWith('/shorts/')) {
        const shortId = parsed.pathname.split('/shorts/')[1]?.split(/[/?#]/)[0];
        if (shortId) return `https://www.youtube-nocookie.com/embed/${shortId}`;
      }
    }
  } catch {
    // Malformed URL
  }
  return null;
}

/**
 * Converts a Loom URL into an embeddable URL
 */
export function getLoomEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('loom.com') && parsed.pathname.includes('/share/')) {
      const id = parsed.pathname.split('/share/')[1]?.split(/[/?#]/)[0];
      if (id) return `https://www.loom.com/embed/${id}`;
    }
  } catch {
    // Malformed URL
  }
  return null;
}

/**
 * Parses and categorizes all links found within the raw submission lapse/journal text field.
 */
export function parseLapseLinks(rawText: string): ParsedLink[] {
  const rawUrls = extractRawUrls(rawText);

  return rawUrls.map((url, index) => {
    const lower = url.toLowerCase();
    const id = `lapse-link-${index}-${Date.now()}`;

    // 1. Hack Club Lapse
    if (lower.includes('lapse.hackclub.com')) {
      return {
        id,
        url,
        category: 'lapse',
        title: `Hack Club Lapse #${index + 1}`,
        isEmbeddable: true,
        embedUrl: url,
        note: 'Official Hack Club screen/keystroke timelapse'
      };
    }

    // 2. YouTube Video
    const ytEmbed = getYouTubeEmbedUrl(url);
    if (ytEmbed) {
      return {
        id,
        url,
        category: 'video',
        title: `YouTube Video Demo #${index + 1}`,
        isEmbeddable: true,
        embedUrl: ytEmbed,
        note: 'Embedded YouTube video player'
      };
    }

    // 3. Loom Video
    const loomEmbed = getLoomEmbedUrl(url);
    if (loomEmbed) {
      return {
        id,
        url,
        category: 'video',
        title: `Loom Screen Recording #${index + 1}`,
        isEmbeddable: true,
        embedUrl: loomEmbed,
        note: 'Embedded Loom walkthrough'
      };
    }

    // 4. Direct video files (.mp4, .webm)
    if (lower.endsWith('.mp4') || lower.endsWith('.webm')) {
      return {
        id,
        url,
        category: 'video',
        title: `Video File (${url.split('/').pop()})`,
        isEmbeddable: true,
        embedUrl: url,
        note: 'Direct HTML5 video stream'
      };
    }

    // 5. GitHub Journal / Devlog markdown
    if (lower.includes('github.com') && (lower.endsWith('.md') || lower.includes('journal') || lower.includes('devlog'))) {
      const fileName = url.split('/').pop() || 'journal.md';
      return {
        id,
        url,
        category: 'journal',
        title: `Markdown Devlog (${fileName})`,
        isEmbeddable: false,
        note: 'Devlog / Journal in GitHub repository'
      };
    }

    // 6. Generic GitHub link
    if (lower.includes('github.com')) {
      return {
        id,
        url,
        category: 'code',
        title: `GitHub Reference`,
        isEmbeddable: false,
        note: 'Code or asset link'
      };
    }

    // 7. Other general links
    return {
      id,
      url,
      category: 'other',
      title: `External Resource`,
      isEmbeddable: false,
      note: 'External link'
    };
  });
}

/**
 * Validates the Playable URL against GitBook rules:
 * - Playable URL cannot be the code repository (GitBook rule #10 blocker)
 * - Prohibited hosts: Streamlit (disallowed host without prior approval)
 * - Detects embeddability (YouTube, Vimeo, Web deployment)
 */
export function validatePlayableUrl(playableUrl: string, codeUrl: string): PlayableValidation {
  const warnings: string[] = [];
  const cleanPlayable = normalizeUrl(playableUrl);
  const cleanCode = normalizeUrl(codeUrl);

  // 1. Check if Playable URL is identical to Code URL
  const isCodeDuplicate = Boolean(
    cleanPlayable && 
    cleanCode && 
    (cleanPlayable === cleanCode || cleanPlayable.startsWith(cleanCode))
  );

  if (isCodeDuplicate) {
    warnings.push('CRITICAL: Playable URL points to the source code repository instead of a live deployment or demo video (GitBook Criterion #10 violation).');
  }

  // 2. Check for prohibited or discouraged hosting platforms
  let isProhibitedHost = false;
  let prohibitedReason = '';

  if (cleanPlayable.includes('streamlit.app')) {
    isProhibitedHost = true;
    prohibitedReason = 'Streamlit hosting is prohibited under Fine-Shield guidelines unless pre-approved.';
    warnings.push(prohibitedReason);
  } else if (cleanPlayable.includes('localhost') || cleanPlayable.includes('127.0.0.1')) {
    isProhibitedHost = true;
    prohibitedReason = 'Playable URL points to localhost/127.0.0.1, which is inaccessible to reviewers.';
    warnings.push(prohibitedReason);
  }

  // 3. Check for YouTube / Video embed
  const ytEmbed = getYouTubeEmbedUrl(playableUrl);
  if (ytEmbed) {
    return {
      isCodeDuplicate,
      isProhibitedHost,
      prohibitedReason,
      isCliScript: false,
      embedType: 'youtube',
      embedUrl: ytEmbed,
      warnings
    };
  }

  // 4. Check for Loom embed
  const loomEmbed = getLoomEmbedUrl(playableUrl);
  if (loomEmbed) {
    return {
      isCodeDuplicate,
      isProhibitedHost,
      prohibitedReason,
      isCliScript: false,
      embedType: 'video',
      embedUrl: loomEmbed,
      warnings
    };
  }

  // 5. Standard interactive web app vs non-embeddable code
  if (isCodeDuplicate) {
    return {
      isCodeDuplicate: true,
      isProhibitedHost,
      prohibitedReason,
      isCliScript: true,
      embedType: 'external',
      warnings
    };
  }

  // 6. Regular Web URL (e.g. Vercel, Netlify, Cloudflare Pages, GitHub Pages)
  const isWebUrl = playableUrl.startsWith('http://') || playableUrl.startsWith('https://');

  return {
    isCodeDuplicate,
    isProhibitedHost,
    prohibitedReason,
    isCliScript: false,
    embedType: isWebUrl ? 'iframe' : 'external',
    embedUrl: isWebUrl ? playableUrl : undefined,
    warnings
  };
}
