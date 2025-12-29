// StopTheSlop - Reddit Content Script
// Platform-specific implementation for Reddit

class RedditAIDetector extends BaseAIDetector {
  constructor() {
    super('Reddit');
    this.init();
  }

  findPosts(container) {
    const posts = [];
    const seen = new Set();

    const addPost = (element, type) => {
      if (!seen.has(element)) {
        seen.add(element);
        posts.push({ element, type });
        if (this.visibilityObserver) {
          this.visibilityObserver.observe(element);
        }
      }
    };

    // Helper to check container and children
    const checkSelector = (selector, type, ancestorSearch = false) => {
      // Check container itself
      if (container.matches && container.matches(selector)) {
        if (ancestorSearch) {
          const postContainer = container.closest('shreddit-post') || container.closest('[data-testid="post-container"]') || container;
          addPost(postContainer, type);
        } else {
          addPost(container, type);
        }
      }

      // Check descendants
      const elements = container.querySelectorAll(selector);
      elements.forEach((el) => {
        if (ancestorSearch) {
          const postContainer = el.closest('shreddit-post') || el.closest('[data-testid="post-container"]') || el;
          addPost(postContainer, type);
        } else {
          addPost(el, type);
        }
      });
    };

    // New Reddit - Original Post (OP) on thread pages
    // Selector targets content inside the post, so we look up to findings parent
    checkSelector('[data-test-id="post-content"], [slot="post-media-container"]', 'new-reddit-op', true);

    // New Reddit post containers (feed view)
    checkSelector('[data-testid="post-container"], shreddit-post', 'new-reddit-post');

    // New Reddit comments
    checkSelector('shreddit-comment, [data-testid="comment"]', 'new-reddit-comment');

    // Old Reddit - Original Post (OP) on thread pages
    checkSelector('.sitetable.linklisting > .thing.link, #siteTable > .thing.link', 'old-reddit-op');

    // Old Reddit posts (feed view)
    checkSelector('.thing.link', 'old-reddit-post');

    // Old Reddit comments
    checkSelector('.thing.comment', 'old-reddit-comment');

    return posts;
  }

  extractText(postData) {
    const { element, type } = postData;
    let text = '';
    let titleElement = null;
    let bodyElement = null;

    switch (type) {
      case 'new-reddit-op':
        titleElement = element.querySelector('[slot="title"], h1, h3') || document.querySelector('h1[slot="title"]');
        bodyElement = element.querySelector('[slot="text-body"], [data-click-id="text"], .md, [data-test-id="post-content"]');
        if (!bodyElement) {
          bodyElement = document.querySelector('shreddit-post [slot="text-body"], [data-test-id="post-content"] .md');
        }
        break;
      case 'new-reddit-post':
        titleElement = element.querySelector('[slot="title"], h1, h3');
        bodyElement = element.querySelector('[slot="text-body"], [data-click-id="text"]');
        break;
      case 'new-reddit-comment':
        bodyElement = element.querySelector('[slot="comment"], .md');
        break;
      case 'old-reddit-op':
        titleElement = element.querySelector('.title a.title') || document.querySelector('.title a.title');
        bodyElement = element.querySelector('.expando .usertext-body .md') || document.querySelector('.expando .usertext-body .md');
        if (!bodyElement) {
          bodyElement = document.querySelector('.thing.link .usertext-body .md');
        }
        break;
      case 'old-reddit-post':
        titleElement = element.querySelector('.title a.title');
        bodyElement = element.querySelector('.expando .usertext-body .md');
        break;
      case 'old-reddit-comment':
        bodyElement = element.querySelector('.usertext-body .md');
        break;
    }

    if (titleElement) {
      text += titleElement.textContent.trim() + '\n\n';
    }
    if (bodyElement) {
      text += bodyElement.textContent.trim();
    }

    return text.trim();
  }

  positionScanButton(element, type, button) {
    switch (type) {
      case 'new-reddit-op':
      case 'new-reddit-post':
        // Try multiple possible locations for new Reddit
        // 1. Before the overflow menu (three dots)
        const overflowMenu = element.querySelector('shreddit-post-overflow-menu');
        if (overflowMenu) {
          const target = overflowMenu.closest('shreddit-async-loader') || overflowMenu;
          if (target.parentElement) {
            button.classList.add('sts-before-overflow');
            target.parentElement.insertBefore(button, target);
            return true;
          }
        }
        // 2. In the action row / credit bar area
        const actionRow = element.querySelector('shreddit-post-share-button, [slot="share-button"]');
        if (actionRow && actionRow.parentElement) {
          actionRow.parentElement.insertBefore(button, actionRow);
          return true;
        }
        // 3. Credit bar or header area
        const creditBar = element.querySelector('[slot="credit-bar"], [data-testid="post-top-meta"], header, .top-matter');
        if (creditBar) {
          creditBar.appendChild(button);
          return true;
        }
        break;
      case 'new-reddit-comment':
        const commentActionRow = element.querySelector('shreddit-comment-action-row, [slot="commentMeta"], header');
        if (commentActionRow) {
          commentActionRow.appendChild(button);
          return true;
        }
        break;
      case 'old-reddit-op':
      case 'old-reddit-post':
      case 'old-reddit-comment':
        const tagline = element.querySelector('.tagline');
        if (tagline) {
          tagline.appendChild(button);
          return true;
        }
        break;
    }
    // Final fallback - prepend to element
    element.style.position = 'relative';
    element.prepend(button);
    return true;
  }

  positionIndicator(element, type, indicator) {
    switch (type) {
      case 'new-reddit-op':
      case 'new-reddit-post':
        // Try multiple possible locations for new Reddit
        // 1. Before the overflow menu (three dots)
        const overflowMenu = element.querySelector('shreddit-post-overflow-menu');
        if (overflowMenu) {
          const target = overflowMenu.closest('shreddit-async-loader') || overflowMenu;
          if (target.parentElement) {
            indicator.classList.add('sts-before-overflow');
            target.parentElement.insertBefore(indicator, target);
            return true;
          }
        }
        // 2. In the action row / credit bar area
        const actionRow = element.querySelector('shreddit-post-share-button, [slot="share-button"]');
        if (actionRow && actionRow.parentElement) {
          actionRow.parentElement.insertBefore(indicator, actionRow);
          return true;
        }
        // 3. Credit bar or header area
        const creditBar = element.querySelector('[slot="credit-bar"], [data-testid="post-top-meta"], header, .top-matter');
        if (creditBar) {
          creditBar.appendChild(indicator);
          return true;
        }
        break;
      case 'new-reddit-comment':
        const commentActionRow = element.querySelector('shreddit-comment-action-row, [slot="commentMeta"], header');
        if (commentActionRow) {
          commentActionRow.appendChild(indicator);
          return true;
        }
        break;
      case 'old-reddit-op':
      case 'old-reddit-post':
      case 'old-reddit-comment':
        const tagline = element.querySelector('.tagline');
        if (tagline) {
          tagline.appendChild(indicator);
          return true;
        }
        break;
    }
    // Final fallback - prepend to element
    element.style.position = 'relative';
    element.prepend(indicator);
    return true;
  }
}

// Initialize
initializeDetector(RedditAIDetector, 'Reddit');
