// StopTheSlop - LinkedIn Content Script
// Platform-specific implementation for LinkedIn

class LinkedInAIDetector extends BaseAIDetector {
  constructor() {
    super('LinkedIn');
    this.processedUrns = new Set();
    this.init();
  }

  findPosts(container) {
    const posts = [];

    // LinkedIn feed posts - strict selectors to avoid matching internal containers
    const POST_SELECTOR = `
      .feed-shared-update-v2,
      .occludable-update,
      [data-id^="urn:li:activity"],
      [data-id^="urn:li:aggregate"],
      [data-id^="urn:li:ugcPost"],
      [data-id^="urn:li:share"],
      div[role="article"],
      div[data-urn],
      div[componentkey^="expanded"],
      div.bd9e921c
    `;

    // LinkedIn comments
    const COMMENT_SELECTOR = '.comments-comment-item, [class*="comment-item"]';

    const checkAndAdd = (element, type) => {
      // Exclude composer/draft area (Start a post box)
      if (element.closest('[componentkey*="draft-text"], [aria-label="Start a post"], .share-box-feed-entry__wrapper') ||
        element.querySelector('[componentkey*="draft-text"]')) {
        return;
      }

      // 1. Strict ID Check (Deduplication)
      const urn = element.getAttribute('data-id') || element.getAttribute('data-urn');

      if (urn) {
        this.processedUrns.add(urn);
      } else {
        if (this.processedElements.has(element)) return;

        // SKIP if this element is inside another valid post container
        const parentPost = element.parentElement ? element.parentElement.closest(POST_SELECTOR) : null;
        if (parentPost && parentPost !== element) {
          return;
        }
      }

      // Check visuals - skip if already has button or indicator
      if (element.querySelector('.sts-indicator')) return;
      if (element.querySelector('.sts-scan-btn')) return;

      posts.push({ element, type });
      if (this.visibilityObserver) {
        this.visibilityObserver.observe(element);
      }
    };

    // Check ancestors/container itself
    if (container.matches && container.matches(POST_SELECTOR)) {
      checkAndAdd(container, 'linkedin-post');
    }

    // Check descendants
    const feedPosts = container.querySelectorAll(POST_SELECTOR);
    feedPosts.forEach((element) => checkAndAdd(element, 'linkedin-post'));

    // Check container for comments
    if (container.matches && container.matches(COMMENT_SELECTOR)) {
      checkAndAdd(container, 'linkedin-comment');
    }

    const comments = container.querySelectorAll(COMMENT_SELECTOR);
    comments.forEach((element) => checkAndAdd(element, 'linkedin-comment'));

    return posts;
  }

  extractText(postData) {
    const { element, type } = postData;
    let text = '';

    switch (type) {
      case 'linkedin-post':
        // 1. Try specific text containers in order of reliability
        const selectors = [
          '[data-testid="expandable-text-box"]',
          '.feed-shared-update-v2__description',
          '.feed-shared-update-v2__commentary',
          '.update-components-update-v2__commentary',
          '.feed-shared-inline-show-more-text',
          '.feed-shared-text',
          '.update-components-text',
          '.break-words'
        ];

        let textContainer = null;
        for (const sel of selectors) {
          textContainer = element.querySelector(sel);
          if (textContainer && textContainer.innerText?.trim()) {
            break;
          }
        }

        if (textContainer) {
          text = textContainer.innerText?.trim() || '';
        }

        // 2. If empty, try broader text wrappers
        if (!text) {
          const broadText = element.querySelector('.feed-shared-update-v2__content, .update-components-update-v2__commentary');
          if (broadText) {
            text = broadText.innerText?.trim() || '';
          }
        }

        // 3. Last resort fallback
        if (!text) {
          const clone = element.cloneNode(true);
          const noiseSelectors = [
            '.update-components-actor',
            '.update-components-header',
            '.feed-shared-social-action-bar',
            '.update-components-social-activity',
            '.feed-shared-actor',
            '.feed-shared-actor__container',
            'button[aria-label^="Open control menu"]',
            'button[aria-label*="Follow"]'
          ];
          noiseSelectors.forEach(sel => {
            const noise = clone.querySelectorAll(sel);
            noise.forEach(n => n.remove());
          });
          text = clone.textContent?.trim() || '';
        }
        break;
      case 'linkedin-comment':
        const commentContent = element.querySelector('.comments-comment-item__main-content, [class*="comment-text"]');
        if (commentContent) {
          text = commentContent.innerText?.trim() || '';
        }
        break;
    }

    // Clean up "hashtag" text that LinkedIn hides visually for screen readers
    // It typically appears as "hashtag\n#SomeTag" or similar due to text extraction
    text = text.replace(/(^|\s)hashtag\s+(?=#)/gmi, '$1');

    return text;
  }

  positionScanButton(element, type, button) {
    return this._injectControl(element, type, button);
  }

  positionIndicator(element, type, indicator) {
    return this._injectControl(element, type, indicator);
  }

  /**
   * Inject control (button or indicator) into the post.
   * Returns true if successful, false if no valid target found.
   * CRITICAL: Final duplicate check happens right before DOM insertion.
   *
   * NOTE: LinkedIn uses obfuscated/hashed CSS class names that change
   * frequently. To stay resilient, injection strategies rely on
   * structural/semantic attributes (aria-labels, tag hierarchy, computed
   * styles) rather than specific class names wherever possible.
   */
  _injectControl(element, type, control) {
    switch (type) {
      case 'linkedin-post':
        // Hardcode dimensions to match LinkedIn's native 32x32px icon buttons
        control.style.width = '32px';
        control.style.height = '32px';

        // Ensure our icon image matches the native icon size roughly (LinkedIn uses 24px svgs usually)
        const iconImg = control.querySelector('.sts-btn-img');
        if (iconImg) {
          iconImg.style.width = '24px';
          iconImg.style.height = '24px';
        }

        // FINAL duplicate check - right before any DOM manipulation
        const existingBtn = element.querySelector('.sts-scan-btn');
        const existingIndicator = element.querySelector('.sts-indicator');

        // If we're adding a button and one exists, abort
        if (control.classList.contains('sts-scan-btn') && existingBtn) return true;
        // If we're adding an indicator and one exists, abort
        if (control.classList.contains('sts-indicator') && existingIndicator) return true;

        // Helper: find the nearest ancestor that is a flex row container.
        // This locates the "header row" of a post (author avatar, name, buttons)
        // without depending on any specific class name.
        const findFlexRowParent = (startEl) => {
          let el = startEl;
          for (let i = 0; i < 6; i++) {
            el = el.parentElement;
            if (!el || el === element) return null;
            try {
              const style = getComputedStyle(el);
              if (style.display === 'flex' && style.flexDirection === 'row') {
                return el;
              }
            } catch (_) { /* ignore */ }
          }
          return null;
        };

        // Strategy 1: "Follow" / "Following" button
        // We prefer inserting before the follow button to avoid overlapping issues on the right edge.
        const followBtn = element.querySelector(
          'button[aria-label*="Follow"], button[aria-label*="Following"]'
        );

        if (followBtn) {
          const headerRow = findFlexRowParent(followBtn);
          if (headerRow) {
            let targetChild = followBtn;
            while (targetChild.parentElement && targetChild.parentElement !== headerRow) {
              targetChild = targetChild.parentElement;
            }
            const followStyle = window.getComputedStyle(followBtn);
            const marginTop = parseInt(followStyle.marginTop) || 0;
            control.style.marginRight = '6px';
            control.style.marginLeft = '6px';
            control.style.marginTop = (marginTop + 6) + 'px';
            control.style.alignSelf = followStyle.alignSelf !== 'auto' ? followStyle.alignSelf : 'auto';
            headerRow.insertBefore(control, targetChild);
            return true;
          }
        }

        // Strategy 2: "Open control menu" button ("…" menu) — fallback
        const menuBtn = element.querySelector(
          'button[aria-label^="Open control menu"], button[aria-label*="control menu"]'
        );

        if (menuBtn) {
          const headerRow = findFlexRowParent(menuBtn);
          if (headerRow) {
            // Walk menuBtn up to become a direct child of headerRow
            let targetChild = menuBtn;
            while (targetChild.parentElement && targetChild.parentElement !== headerRow) {
              targetChild = targetChild.parentElement;
            }
            control.style.marginRight = '0px';
            control.style.marginLeft = '8px';
            control.style.marginTop = '6px';
            control.style.alignSelf = 'flex-start';
            headerRow.insertBefore(control, targetChild);
            return true;
          }
          // Fallback: just insert before the menu button in its direct parent
          control.style.marginLeft = '8px';
          menuBtn.parentElement.insertBefore(control, menuBtn);
          return true;
        }

        // Strategy 3: Legacy class-based selectors (older LinkedIn versions)
        const legacyActor = element.querySelector(
          '.update-components-actor, .feed-shared-actor'
        );
        if (legacyActor) {
          legacyActor.appendChild(control);
          return true;
        }

        // No valid injection target - return false, periodic check will retry later
        return false;

      case 'linkedin-comment':
        const commentActions = element.querySelector('.comment-actions, [class*="comment-action"]');
        if (commentActions) {
          commentActions.appendChild(control);
          return true;
        }
        return false;
    }
    return false;
  }
}

// Initialize
initializeDetector(LinkedInAIDetector, 'LinkedIn');
