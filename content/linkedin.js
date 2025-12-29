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
      div[role="article"]
    `;

    // LinkedIn comments
    const COMMENT_SELECTOR = '.comments-comment-item, [class*="comment-item"]';

    const checkAndAdd = (element, type) => {
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
        // 1. Try specific text containers first (most accurate)
        const textContainer = element.querySelector(`
          .feed-shared-update-v2__description,
          .feed-shared-update-v2__commentary,
          .feed-shared-inline-show-more-text,
          .feed-shared-text,
          .update-components-text.relative
        `);
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
            '.feed-shared-actor__container'
          ];
          noiseSelectors.forEach(sel => {
            const noise = clone.querySelectorAll(sel);
            noise.forEach(n => n.remove());
          });
          text = clone.innerText?.trim() || '';
        }
        break;
      case 'linkedin-comment':
        const commentContent = element.querySelector('.comments-comment-item__main-content, [class*="comment-text"]');
        if (commentContent) {
          text = commentContent.innerText?.trim() || '';
        }
        break;
    }

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
   */
  _injectControl(element, type, control) {
    switch (type) {
      case 'linkedin-post':
        // FINAL duplicate check - right before any DOM manipulation
        const existingBtn = element.querySelector('.sts-scan-btn');
        const existingIndicator = element.querySelector('.sts-indicator');

        // If we're adding a button and one exists, abort
        if (control.classList.contains('sts-scan-btn') && existingBtn) return true;
        // If we're adding an indicator and one exists, abort
        if (control.classList.contains('sts-indicator') && existingIndicator) return true;

        // Strategy 1: "Follow" Button (Highest Priority)
        const followBtn = element.querySelector(`
          .feed-shared-actor__follow-button,
          .update-components-actor__follow-button,
          .feed-shared-actor__subtext-container .feed-shared-actor__follow-button,
          .follows-recommendation-card__follow-btn,
          button[aria-label*="Follow"],
          button[aria-label*="Following"]
        `);

        if (followBtn && followBtn.parentElement) {
          control.style.marginRight = '8px';
          followBtn.parentElement.insertBefore(control, followBtn);
          return true;
        }

        // Strategy 2: Top-right menu trigger area ("...")
        const menuContainer = element.querySelector('.feed-shared-control-menu__trigger, .update-components-control-menu__trigger');
        if (menuContainer && menuContainer.parentElement) {
          control.style.marginRight = '4px';
          menuContainer.parentElement.insertBefore(control, menuContainer);
          return true;
        }

        // Strategy 3: "Likes this" / Social Proof Header
        const headerActor = element.querySelector('.update-components-header .update-components-actor__container');
        if (headerActor) {
          headerActor.appendChild(control);
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
