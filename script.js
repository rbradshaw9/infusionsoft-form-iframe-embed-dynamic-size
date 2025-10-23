'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('config-form');
  const outputSection = document.getElementById('output');
  const infusionsoftCodeEl = document.getElementById('infusionsoftCode');
  const gohighlevelCodeEl = document.getElementById('gohighlevelCode');
  const resetBtn = document.getElementById('reset-btn');
  const advancedToggle = document.getElementById('advanced-toggle');
  const advancedContent = document.getElementById('advanced-content');

  // Advanced options toggle
  advancedToggle.addEventListener('click', () => {
    const isExpanded = advancedContent.classList.toggle('expanded');
    advancedToggle.classList.toggle('active', isExpanded);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const iframeUrlRaw = formData.get('iframeUrl');
    const placement = formData.get('placement') || 'above';
    const formSelector = (formData.get('formSelector') || '').trim() || '#content';
    const buttonClassRaw = (formData.get('buttonClass') || '').trim();
    const minHeight = Number(formData.get('minHeight')) || 600;
    const scrollOffset = Number(formData.get('scrollOffset')) || 0;

    if (!iframeUrlRaw) {
      alert('Please provide the GoHighLevel page URL.');
      return;
    }

    let iframeUrl;
    try {
      iframeUrl = new URL(iframeUrlRaw);
    } catch (error) {
      alert('The page URL must be valid (include https://).');
      return;
    }

    if (iframeUrl.protocol !== 'https:') {
      alert('Infusionsoft requires secure (https://) embeds.');
      return;
    }

    const buttonClasses = normaliseButtonClasses(buttonClassRaw);
    if (!buttonClasses.length) {
      alert('Please provide at least one GoHighLevel button class.');
      return;
    }

    const embedId = createEmbedId();
    const infusionsoftSnippet = buildInfusionsoftSnippet({
      iframeUrl,
      placement,
      formSelector,
      minHeight,
      scrollOffset,
      buttonClasses,
      embedId
    });
    const gohighlevelSnippet = buildGoHighLevelSnippet({
      embedId,
      buttonClasses
    });

    infusionsoftCodeEl.textContent = infusionsoftSnippet;
    gohighlevelCodeEl.textContent = gohighlevelSnippet;
    outputSection.hidden = false;
    window.scrollTo({ top: outputSection.offsetTop - 16, behavior: 'smooth' });
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    outputSection.hidden = true;
    infusionsoftCodeEl.textContent = '';
    gohighlevelCodeEl.textContent = '';
  });

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('.copy-btn');
    if (!button) {
      return;
    }

    const targetId = button.dataset.copyTarget;
    const codeElement = document.getElementById(targetId);
    if (!codeElement) {
      return;
    }

    const text = codeElement.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.classList.add('copied');
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.classList.remove('copied');
        button.textContent = 'Copy';
      }, 1600);
    } catch (error) {
      fallBackCopy(text);
    }
  });
});

function normaliseButtonClasses(input) {
  return input
    .split(/[,\s]+/)
    .map((entry) => entry.trim().replace(/^\./, ''))
    .filter(Boolean);
}

function createEmbedId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return `ghlEmbed_${window.crypto.randomUUID()}`;
  }
  const now = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `ghlEmbed_${now}_${random}`;
}

function buildInfusionsoftSnippet({
  iframeUrl,
  placement,
  formSelector,
  minHeight,
  scrollOffset,
  buttonClasses,
  embedId
}) {
  const url = new URL(iframeUrl.href);
  url.searchParams.set('ghlEmbedId', embedId);
  const iframeSrc = url.toString();
  const iframeOrigin = url.origin;

  const config = {
    embedId,
    iframeSrc,
    iframeOrigin,
    formSelector,
    placement,
    minHeight,
    scrollOffset,
    buttonClasses
  };

  const script = `\
<script>
(function () {
  var config = ${JSON.stringify(config, null, 2)};
  if (window[config.embedId]) {
    return;
  }
  window[config.embedId] = true;

  var currentHeight = config.minHeight;
  var iframe;
  var formElement;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function findForm() {
    if (formElement && document.contains(formElement)) {
      return formElement;
    }
    var candidate = null;
    try {
      candidate = document.querySelector(config.formSelector);
    } catch (error) {
      console.warn('Infusionsoft embed: invalid form selector', config.formSelector);
    }
    if (!candidate) {
      console.warn('Infusionsoft embed: form selector not found, defaulting to document.body');
      candidate = document.body;
    }
    formElement = candidate;
    return formElement;
  }

  function ensureStyle() {
    var styleId = config.embedId + '-style';
    if (document.getElementById(styleId)) {
      return;
    }
    var style = document.createElement('style');
    style.id = styleId;
    var styleContent = '#' + config.embedId + '{width:100%;max-width:100%;margin:0 auto;box-sizing:border-box;position:relative;}' +
      '#' + config.embedId + '[data-placement="above"]{margin-bottom:1.5rem;}' +
      '#' + config.embedId + '[data-placement="below"]{margin-top:1.5rem;}' +
      '#' + config.embedId + ' iframe{width:100%;min-height:' + config.minHeight + 'px;border:0;display:block;background:transparent;}';
    style.textContent = styleContent;
    document.head.appendChild(style);
  }

  function createContainer() {
    var existing = document.getElementById(config.embedId);
    if (existing) {
      existing.dataset.placement = config.placement;
      iframe = existing.querySelector('iframe');
      return existing;
    }
    var container = document.createElement('div');
    container.id = config.embedId;
    container.dataset.placement = config.placement;
    iframe = document.createElement('iframe');
    iframe.id = config.embedId + '-frame';
    iframe.src = config.iframeSrc;
    iframe.title = 'GoHighLevel content';
    iframe.loading = 'lazy';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.style.height = config.minHeight + 'px';
    container.appendChild(iframe);
    return container;
  }

  function mount() {
    ensureStyle();
    var container = createContainer();
    var target = findForm();
    if (!target || !target.parentNode) {
      console.warn('Infusionsoft embed: unable to mount, retrying in 750ms');
      setTimeout(mount, 750);
      return;
    }
    if (config.placement === 'above') {
      target.parentNode.insertBefore(container, target);
    } else {
      target.parentNode.insertBefore(container, target.nextSibling);
    }
  }

  function handleMessage(event) {
    if (event.origin !== config.iframeOrigin) {
      return;
    }
    var data = event.data || {};
    if (data.embedId !== config.embedId) {
      return;
    }
    if (data.type === 'ghl-height') {
      var nextHeight = Number(data.height);
      if (!Number.isFinite(nextHeight)) {
        return;
      }
      nextHeight = Math.max(nextHeight, config.minHeight);
      if (Math.abs(nextHeight - currentHeight) > 2) {
        currentHeight = nextHeight;
        if (iframe) {
          iframe.style.height = currentHeight + 'px';
        }
      }
    }
    if (data.type === 'ghl-scroll-request') {
      var target = findForm();
      if (!target) {
        return;
      }
      var rect = target.getBoundingClientRect();
      var absoluteTop = rect.top + (window.pageYOffset || document.documentElement.scrollTop || 0);
      if (config.scrollOffset) {
        absoluteTop += config.scrollOffset;
      }
      try {
        window.scrollTo({ top: absoluteTop, left: 0, behavior: 'smooth' });
      } catch (error) {
        window.scrollTo(0, absoluteTop);
      }
    }
  }

  window.addEventListener('message', handleMessage, false);
  ready(mount);
})();
</script>`;

  return script.trim();
}

function buildGoHighLevelSnippet({ embedId, buttonClasses }) {
  const script = `\
<script>
(function () {
  var buttonClasses = ${JSON.stringify(buttonClasses)};
  var embedIdParam = 'ghlEmbedId';
  var searchParams;
  try {
    searchParams = new URLSearchParams(window.location.search);
  } catch (error) {
    searchParams = null;
  }
  var embedId = searchParams && searchParams.get(embedIdParam) ? searchParams.get(embedIdParam) : ${JSON.stringify(embedId)};

  function post(message) {
    try {
      window.parent.postMessage(message, '*');
    } catch (error) {
      console.warn('GoHighLevel embed: unable to post message', error);
    }
  }

  function queueHeightUpdate() {
    if (queueHeightUpdate.queued) {
      return;
    }
    queueHeightUpdate.queued = true;
    requestAnimationFrame(function () {
      queueHeightUpdate.queued = false;
      sendHeight();
    });
  }

  function sendHeight() {
    var height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    post({ type: 'ghl-height', embedId: embedId, height: height });
  }

  var resizeObserverSupported = typeof ResizeObserver === 'function';
  if (resizeObserverSupported) {
    var observer = new ResizeObserver(queueHeightUpdate);
    observer.observe(document.body);
  } else {
    setInterval(sendHeight, 600);
  }

  var mutationObserverSupported = typeof MutationObserver === 'function';
  if (mutationObserverSupported) {
    var mutationObserver = new MutationObserver(queueHeightUpdate);
    mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  function findTrigger(element) {
    for (var i = 0; i < buttonClasses.length; i += 1) {
      var cls = buttonClasses[i];
      if (!cls) {
        continue;
      }
      var trigger = element.closest('.' + cls);
      if (trigger) {
        return trigger;
      }
    }
    return null;
  }

  document.addEventListener('click', function (event) {
    var trigger = findTrigger(event.target);
    if (!trigger) {
      return;
    }
    event.preventDefault();
    trigger.blur && trigger.blur();
    post({ type: 'ghl-scroll-request', embedId: embedId });
  });

  window.addEventListener('load', function () {
    setTimeout(sendHeight, 120);
  });

  sendHeight();
})();
</script>`;

  return script.trim();
}

function fallBackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  const selection = document.getSelection();
  const selected = selection ? selection.rangeCount > 0 ? selection.getRangeAt(0) : null : null;
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  if (selected && selection) {
    selection.removeAllRanges();
    selection.addRange(selected);
  }
}
