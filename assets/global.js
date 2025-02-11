function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

class SectionId {
  static #separator = '__';

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section id (e.g. 'template--22224696705326')
  static parseId(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[0];
  }

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section name (e.g. 'main')
  static parseSectionName(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[1];
  }

  // for a section id (e.g. 'template--22224696705326') and a section name (e.g. 'recommended-products'), return a qualified section id (e.g. 'template--22224696705326__recommended-products')
  static getIdForSection(sectionId, sectionName) {
    return `${sectionId}${SectionId.#separator}${sectionName}`;
  }
}

class HTMLUpdateUtility {
  /**
   * Used to swap an HTML node with a new node.
   * The new node is inserted as a previous sibling to the old node, the old node is hidden, and then the old node is removed.
   *
   * The function currently uses a double buffer approach, but this should be replaced by a view transition once it is more widely supported https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
   */
  static viewTransition(oldNode, newContent, preProcessCallbacks = [], postProcessCallbacks = []) {
    preProcessCallbacks?.forEach((callback) => callback(newContent));

    const newNodeWrapper = document.createElement('div');
    HTMLUpdateUtility.setInnerHTML(newNodeWrapper, newContent.outerHTML);
    const newNode = newNodeWrapper.firstChild;

    // dedupe IDs
    const uniqueKey = Date.now();
    oldNode.querySelectorAll('[id], [form]').forEach((element) => {
      element.id && (element.id = `${element.id}-${uniqueKey}`);
      element.form && element.setAttribute('form', `${element.form.getAttribute('id')}-${uniqueKey}`);
    });

    oldNode.parentNode.insertBefore(newNode, oldNode);
    oldNode.style.display = 'none';

    postProcessCallbacks?.forEach((callback) => callback(newNode));

    setTimeout(() => oldNode.remove(), 500);
  }

  // Sets inner HTML and reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
  static setInnerHTML(element, html) {
    element.innerHTML = html;
    element.querySelectorAll('script').forEach((oldScriptTag) => {
      const newScriptTag = document.createElement('script');
      Array.from(oldScriptTag.attributes).forEach((attribute) => {
        newScriptTag.setAttribute(attribute.name, attribute.value);
      });
      newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
      oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
    });
  }
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer, menu-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus.tagName === 'INPUT' &&
    ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN',
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    if (event.target.name === 'plus') {
      if (parseInt(this.input.dataset.min) > parseInt(this.input.step) && this.input.value == 0) {
        this.input.value = this.input.dataset.min;
      } else {
        this.input.stepUp();
      }
    } else {
      this.input.stepDown();
    }

    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);

    if (this.input.dataset.min === previousValue && event.target.name === 'minus') {
      this.input.value = parseInt(this.input.min);
    }
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', parseInt(value) <= parseInt(this.input.min));
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}

customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this))
    );
    this.querySelectorAll(
      'button:not(.localization-selector):not(.country-selector__close-button):not(.country-filter__reset-button)'
    ).forEach((button) => button.addEventListener('click', this.onCloseButtonClick.bind(this)));
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'))
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);

      if (window.matchMedia('(max-width: 990px)')) {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        if (!document.body.classList.contains('collection')) {
          parentMenuElement && parentMenuElement.classList.add('submenu-open');
          !reducedMotion || reducedMotion.matches
            ? addTrapFocus()
            : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
        }
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove('menu-opening');
    this.mainDetailsToggle.querySelectorAll('details').forEach((details) => {
      details.removeAttribute('open');
      details.classList.remove('menu-opening');
    });
    this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach((submenu) => {
      submenu.classList.remove('submenu-open');
    });
    document.body.classList.remove(`overflow-hidden-${this.dataset.breakpoint}`);
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);

    if (event instanceof KeyboardEvent) elementToFocus?.setAttribute('aria-expanded', false);
  }

  onFocusOut() {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement))
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        if (detailsElement.closest('details[open]')) {
          trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('menu-drawer', MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.querySelector('.section-header');
    this.borderOffset =
      this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    document.documentElement.style.setProperty(
      '--header-bottom-position',
      `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
    );
    this.header.classList.add('menu-open');

    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    window.addEventListener('resize', this.onResize);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus) {
    if (!elementToFocus) return;
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
    window.removeEventListener('resize', this.onResize);
  }

  onResize = () => {
    this.header &&
      document.documentElement.style.setProperty(
        '--header-bottom-position',
        `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
      );
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  };
}

customElements.define('header-drawer', HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener('click', this.hide.bind(this, false));
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    this.dataset.section = this.closest('.shopify-section').id.replace('shopify-section-', '');
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);

class BulkModal extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);
      if (this.innerHTML.trim() === '') {
        const productUrl = this.dataset.url.split('?')[0];
        fetch(`${productUrl}?section_id=bulk-quick-order-list`)
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            const sourceQty = html.querySelector('.quick-order-list-container').parentNode;
            this.innerHTML = sourceQty.innerHTML;
          })
          .catch((e) => {
            console.error(e);
          });
      }
    };

    new IntersectionObserver(handleIntersection.bind(this)).observe(
      document.querySelector(`#QuickBulk-${this.dataset.productId}-${this.dataset.sectionId}`)
    );
  }
}

customElements.define('bulk-modal', BulkModal);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      if (focus) deferredElement.focus();
      if (deferredElement.nodeName == 'VIDEO' && deferredElement.getAttribute('autoplay')) {
        // force autoplay for safari
        deferredElement.play();
      }
    }
  }
}

customElements.define('deferred-media', DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]');
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    if (!this.slider || !this.nextButton) return;

    this.initPages();
    const resizeObserver = new ResizeObserver((entries) => this.initPages());
    resizeObserver.observe(this.slider);

    this.slider.addEventListener('scroll', this.update.bind(this));
    this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
    this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter((element) => element.clientWidth > 0);
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
    this.slidesPerPage = Math.floor(
      (this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset
    );
    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    // Temporarily prevents unneeded updates resulting from variant changes
    // This should be refactored as part of https://github.com/Shopify/dawn/issues/2057
    if (!this.slider || !this.nextButton) return;

    const previousPage = this.currentPage;
    this.currentPage = Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }

    if (this.currentPage != previousPage) {
      this.dispatchEvent(
        new CustomEvent('slideChanged', {
          detail: {
            currentPage: this.currentPage,
            currentElement: this.sliderItemsToShow[this.currentPage - 1],
          },
        })
      );
    }

    if (this.enableSliderLooping) return;

    if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.slider.scrollLeft === 0) {
      this.prevButton.setAttribute('disabled', 'disabled');
    } else {
      this.prevButton.removeAttribute('disabled');
    }

    if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
      this.nextButton.setAttribute('disabled', 'disabled');
    } else {
      this.nextButton.removeAttribute('disabled');
    }
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
    return element.offsetLeft + element.clientWidth <= lastVisibleSlide && element.offsetLeft >= this.slider.scrollLeft;
  }

  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    this.slideScrollPosition =
      event.currentTarget.name === 'next'
        ? this.slider.scrollLeft + step * this.sliderItemOffset
        : this.slider.scrollLeft - step * this.sliderItemOffset;
    this.setSlidePosition(this.slideScrollPosition);
  }

  setSlidePosition(position) {
    this.slider.scrollTo({
      left: position,
    });
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector('.slideshow__slide');
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.announcementBarSlider = this.querySelector('.announcement-bar-slider');
    // Value below should match --duration-announcement-bar CSS value
    this.announcerBarAnimationDelay = this.announcementBarSlider ? 250 : 0;

    this.sliderControlLinksArray = Array.from(this.sliderControlWrapper.querySelectorAll('.slider-counter__link'));
    this.sliderControlLinksArray.forEach((link) => link.addEventListener('click', this.linkToSlide.bind(this)));
    this.slider.addEventListener('scroll', this.setSlideVisibility.bind(this));
    this.setSlideVisibility();

    if (this.announcementBarSlider) {
      this.announcementBarArrowButtonWasClicked = false;

      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion.addEventListener('change', () => {
        if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
      });

      [this.prevButton, this.nextButton].forEach((button) => {
        button.addEventListener(
          'click',
          () => {
            this.announcementBarArrowButtonWasClicked = true;
          },
          { once: true }
        );
      });
    }

    if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
  }

  setAutoPlay() {
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    this.addEventListener('mouseover', this.focusInHandling.bind(this));
    this.addEventListener('mouseleave', this.focusOutHandling.bind(this));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));

    if (this.querySelector('.slideshow__autoplay')) {
      this.sliderAutoplayButton = this.querySelector('.slideshow__autoplay');
      this.sliderAutoplayButton.addEventListener('click', this.autoPlayToggle.bind(this));
      this.autoplayButtonIsSetToPlay = true;
      this.play();
    } else {
      this.reducedMotion.matches || this.announcementBarArrowButtonWasClicked ? this.pause() : this.play();
    }
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    this.wasClicked = true;

    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) {
      this.applyAnimationToAnnouncementBar(event.currentTarget.name);
      return;
    }

    if (isFirstSlide && event.currentTarget.name === 'previous') {
      this.slideScrollPosition =
        this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === 'next') {
      this.slideScrollPosition = 0;
    }

    this.setSlidePosition(this.slideScrollPosition);

    this.applyAnimationToAnnouncementBar(event.currentTarget.name);
  }

  setSlidePosition(position) {
    if (this.setPositionTimeout) clearTimeout(this.setPositionTimeout);
    this.setPositionTimeout = setTimeout(() => {
      this.slider.scrollTo({
        left: position,
      });
    }, this.announcerBarAnimationDelay);
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach((link) => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
    this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
      this.play();
    } else if (!this.reducedMotion.matches && !this.announcementBarArrowButtonWasClicked) {
      this.play();
    }
  }

  focusInHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
        this.play();
      } else if (this.autoplayButtonIsSetToPlay) {
        this.pause();
      }
    } else if (this.announcementBarSlider.contains(event.target)) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    clearInterval(this.autoplay);
    this.autoplay = setInterval(this.autoRotateSlides.bind(this), this.autoplaySpeed);
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.playSlideshow);
    } else {
      this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.pauseSlideshow);
    }
  }

  autoRotateSlides() {
    const slideScrollPosition =
      this.currentPage === this.sliderItems.length ? 0 : this.slider.scrollLeft + this.sliderItemOffset;

    this.setSlidePosition(slideScrollPosition);
    this.applyAnimationToAnnouncementBar();
  }

  setSlideVisibility(event) {
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll('a');
      if (index === this.currentPage - 1) {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.removeAttribute('tabindex');
          });
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');
      } else {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.setAttribute('tabindex', '-1');
          });
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
      }
    });
    this.wasClicked = false;
  }

  applyAnimationToAnnouncementBar(button = 'next') {
    if (!this.announcementBarSlider) return;

    const itemsCount = this.sliderItems.length;
    const increment = button === 'next' ? 1 : -1;

    const currentIndex = this.currentPage - 1;
    let nextIndex = (currentIndex + increment) % itemsCount;
    nextIndex = nextIndex === -1 ? itemsCount - 1 : nextIndex;

    const nextSlide = this.sliderItems[nextIndex];
    const currentSlide = this.sliderItems[currentIndex];

    const animationClassIn = 'announcement-bar-slider--fade-in';
    const animationClassOut = 'announcement-bar-slider--fade-out';

    const isFirstSlide = currentIndex === 0;
    const isLastSlide = currentIndex === itemsCount - 1;

    const shouldMoveNext = (button === 'next' && !isLastSlide) || (button === 'previous' && isFirstSlide);
    const direction = shouldMoveNext ? 'next' : 'previous';

    currentSlide.classList.add(`${animationClassOut}-${direction}`);
    nextSlide.classList.add(`${animationClassIn}-${direction}`);

    setTimeout(() => {
      currentSlide.classList.remove(`${animationClassOut}-${direction}`);
      nextSlide.classList.remove(`${animationClassIn}-${direction}`);
    }, this.announcerBarAnimationDelay * 2);
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition =
      this.slider.scrollLeft +
      this.sliderFirstItemNode.clientWidth *
      (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition,
    });
  }
}

customElements.define('slideshow-component', SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('change', (event) => {
      const target = this.getInputForEventTarget(event.target);
      this.updateSelectionMetadata(event);

      publish(PUB_SUB_EVENTS.optionValueSelectionChange, {
        data: {
          event,
          target,
          selectedOptionValues: this.selectedOptionValues,
        },
      });
    });
  }

  updateSelectionMetadata({ target }) {
    const { value, tagName } = target;

    if (tagName === 'SELECT' && target.selectedOptions.length) {
      Array.from(target.options)
        .find((option) => option.getAttribute('selected'))
        .removeAttribute('selected');
      target.selectedOptions[0].setAttribute('selected', 'selected');

      const swatchValue = target.selectedOptions[0].dataset.optionSwatchValue;
      const selectedDropdownSwatchValue = target
        .closest('.product-form__input')
        .querySelector('[data-selected-value] > .swatch');
      if (!selectedDropdownSwatchValue) return;
      if (swatchValue) {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', swatchValue);
        selectedDropdownSwatchValue.classList.remove('swatch--unavailable');
      } else {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', 'unset');
        selectedDropdownSwatchValue.classList.add('swatch--unavailable');
      }

      selectedDropdownSwatchValue.style.setProperty(
        '--swatch-focal-point',
        target.selectedOptions[0].dataset.optionSwatchFocalPoint || 'unset'
      );
    } else if (tagName === 'INPUT' && target.type === 'radio') {
      const selectedSwatchValue = target.closest(`.product-form__input`).querySelector('[data-selected-value]');
      if (selectedSwatchValue) selectedSwatchValue.innerHTML = value;
    }
  }

  getInputForEventTarget(target) {
    return target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
  }

  get selectedOptionValues() {
    return Array.from(this.querySelectorAll('select option[selected], fieldset input:checked')).map(
      ({ dataset }) => dataset.optionValueId
    );
  }
}

customElements.define('variant-selects', VariantSelects);

class ProductRecommendations extends HTMLElement {
  observer = undefined;

  constructor() {
    super();
  }

  connectedCallback() {
    this.initializeRecommendations(this.dataset.productId);
  }

  initializeRecommendations(productId) {
    this.observer?.unobserve(this);
    this.observer = new IntersectionObserver(
      (entries, observer) => {
        if (!entries[0].isIntersecting) return;
        observer.unobserve(this);
        this.loadRecommendations(productId);
      },
      { rootMargin: '0px 0px 400px 0px' }
    );
    this.observer.observe(this);
  }

  loadRecommendations(productId) {
    fetch(`${this.dataset.url}&product_id=${productId}&section_id=${this.dataset.sectionId}`)
      .then((response) => response.text())
      .then((text) => {
        const html = document.createElement('div');
        html.innerHTML = text;
        const recommendations = html.querySelector('product-recommendations');

        if (recommendations?.innerHTML.trim().length) {
          this.innerHTML = recommendations.innerHTML;
        }

        if (!this.querySelector('slideshow-component') && this.classList.contains('complementary-products')) {
          this.remove();
        }

        if (html.querySelector('.grid__item')) {
          this.classList.add('product-recommendations--loaded');
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }
}

customElements.define('product-recommendations', ProductRecommendations);

class AccountIcon extends HTMLElement {
  constructor() {
    super();

    this.icon = this.querySelector('.icon');
    this.parent = this.parentNode;
  }

  connectedCallback() {
    document.addEventListener('storefront:signincompleted', this.handleStorefrontSignInCompleted.bind(this));
    this.parent.addEventListener('click', this.openPopupAccount.bind(this))
  }

  openPopupAccount(){
    document.querySelector('.header-account-btns').classList.toggle('hidden');
  }

  handleStorefrontSignInCompleted(event) {
    if (event?.detail?.avatar) {
      this.icon?.replaceWith(event.detail.avatar.cloneNode());
    }
  }
}

customElements.define('account-icon', AccountIcon);

class BulkAdd extends HTMLElement {
  constructor() {
    super();
    this.queue = [];
    this.requestStarted = false;
    this.ids = [];
  }

  startQueue(id, quantity) {
    this.queue.push({ id, quantity });
    const interval = setInterval(() => {
      if (this.queue.length > 0) {
        if (!this.requestStarted) {
          this.sendRequest(this.queue);
        }
      } else {
        clearInterval(interval);
      }
    }, 250);
  }

  sendRequest(queue) {
    this.requestStarted = true;
    const items = {};
    queue.forEach((queueItem) => {
      items[parseInt(queueItem.id)] = queueItem.quantity;
    });
    this.queue = this.queue.filter((queueElement) => !queue.includes(queueElement));
    const quickBulkElement = this.closest('quick-order-list') || this.closest('quick-add-bulk');
    quickBulkElement.updateMultipleQty(items);
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    input.value = input.getAttribute('value');
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  validateQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;

    if (inputValue < event.target.dataset.min) {
      this.setValidity(event, index, window.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min));
    } else if (inputValue > parseInt(event.target.max)) {
      this.setValidity(event, index, window.quickOrderListStrings.max_error.replace('[max]', event.target.max));
    } else if (inputValue % parseInt(event.target.step) != 0) {
      this.setValidity(event, index, window.quickOrderListStrings.step_error.replace('[step]', event.target.step));
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.startQueue(index, inputValue);
    }
  }

  getSectionsUrl() {
    if (window.pageNumber) {
      return `${window.location.pathname}?page=${window.pageNumber}`;
    } else {
      return `${window.location.pathname}`;
    }
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }
}

if (!customElements.get('bulk-add')) {
  customElements.define('bulk-add', BulkAdd);
}

class Calendar extends HTMLElement {
  constructor() {
    super();
    this.calendar = new Date(this.dataset.year, parseInt(this.dataset.month) - 1);
    this.localDate = new Date(this.dataset.year, parseInt(this.dataset.month) - 1);
    this.prevMonthLastDate = null;
    this.calWeekDays = ["日", "月", "火", "水", "木", "金", "土"];
    this.calMonthName = [
      "1月",
      "2月",
      "3月",
      "4月",
      "5月",
      "6月",
      "7月",
      "8月",
      "9月",
      "10月",
      "11月",
      "12月"
    ]
  }
  daysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
  }
  firstDay() {
    return new Date(this.calendar.getFullYear(), this.calendar.getMonth(), 1);
  }
  lastDay() {
    return new Date(this.calendar.getFullYear(), this.calendar.getMonth() + 1, 0);
  }
  firstDayNumber() {
    return this.firstDay().getDay() + 1;
  }
  lastDayNumber() {
    return this.lastDay().getDay() + 1;
  }
  getPreviousMonthLastDate() {
    let lastDate = new Date(
      this.calendar.getFullYear(),
      this.calendar.getMonth(),
      0
    ).getDate();
    return lastDate;
  }
  navigateToPreviousMonth() {
    this.calendar.setMonth(this.calendar.getMonth() - 1);
    this.attachEventsOnNextPrev();
  }
  navigateToNextMonth() {
    this.calendar.setMonth(this.calendar.getMonth() + 1);
    this.attachEventsOnNextPrev();
  }
  navigateToCurrentMonth() {
    let currentMonth = this.localDate.getMonth();
    let currentYear = this.localDate.getFullYear();
    this.calendar.setMonth(currentMonth);
    this.calendar.setYear(currentYear);
    this.attachEventsOnNextPrev();
  }
  selectDate(e) {
    console.log(
      `${e.target.textContent} ${this.calMonthName[this.calendar.getMonth()]
      } ${this.calendar.getFullYear()}`
    );
  }
  plotSelectors() {
    this.innerHTML += `<div class="calendar-inner">
      <div class="calendar-today-date">
        ${this.localDate.getFullYear()}年${this.calMonthName[this.localDate.getMonth()]} 
      </div>
      <div class="calendar-body"></div></div>`;
  }
  plotDayNames() {
    for (let i = 0; i < this.calWeekDays.length; i++) {
      this.querySelector(
        ".calendar-body"
      ).innerHTML += `<div class="week-day">${this.calWeekDays[i]}</div>`;
    }
  }
  plotDates() {
    this.querySelector(".calendar-body").innerHTML = "";
    this.plotDayNames();
    let count = 1;
    let prevDateCount = 0;

    this.prevMonthLastDate = this.getPreviousMonthLastDate();
    let prevMonthDatesArray = [];
    let calendarDays = this.daysInMonth(
      this.calendar.getMonth() + 1,
      this.calendar.getFullYear()
    );
    // dates of current month
    for (let i = 1; i < calendarDays; i++) {
      if (i < this.firstDayNumber()) {
        prevDateCount += 1;
        this.querySelector(
          ".calendar-body"
        ).innerHTML += `<div class="prev-dates"></div>`;
        prevMonthDatesArray.push(this.prevMonthLastDate--);
      } else {
        this.querySelector(
          ".calendar-body"
        ).innerHTML += `<div class="number-item" data-month=${this.dataset.month} data-year=${this.dataset.year} data-num=${count}><span class="dateNumber">${count++}</span></div>`;
      }
    }
    //remaining dates after month dates
    for (let j = 0; j < prevDateCount + 1; j++) {
      this.querySelector(
        ".calendar-body"
      ).innerHTML += `<div class="number-item" data-month=${this.dataset.month} data-year=${this.dataset.year} data-num=${count}><span class="dateNumber" >${count++}</span></div>`;
    }
    // this.highlightToday();
    this.plotPrevMonthDates(prevMonthDatesArray);
    this.plotNextMonthDates();
  }
  attachEvents() {
    let prevBtn = this.querySelector(".calendar .calendar-prev a");
    let nextBtn = this.querySelector(".calendar .calendar-next a");
    let todayDate = this.querySelector(".calendar .calendar-today-date");
    let dateNumber = this.querySelectorAll(".calendar .dateNumber");
    // prevBtn.addEventListener(
    //   "click",
    //   this.navigateToPreviousMonth
    // );
    // nextBtn.addEventListener("click", this.navigateToNextMonth);
    // todayDate.addEventListener(
    //   "click",
    //   this.navigateToCurrentMonth
    // );
    // for (var i = 0; i < dateNumber.length; i++) {
    //   dateNumber[i].addEventListener(
    //     "click",
    //     this.selectDate,
    //     false
    //   );
    // }
  }
  highlightToday() {
    let currentMonth = this.localDate.getMonth() + 1;
    let changedMonth = this.calendar.getMonth() + 1;
    let currentYear = this.localDate.getFullYear();
    let changedYear = this.calendar.getFullYear();
    if (
      currentYear === changedYear &&
      currentMonth === changedMonth &&
      this.querySelectorAll(".number-item")
    ) {
      this
        .querySelectorAll(".number-item")
      [this.calendar.getDate() - 1].classList.add("calendar-today");
    }
  }
  plotPrevMonthDates(dates) {
    dates.reverse();
    for (let i = 0; i < dates.length; i++) {
      if (this.querySelectorAll(".prev-dates")) {
        this.querySelectorAll(".prev-dates")[i].textContent = dates[i];
      }
    }
  }
  plotNextMonthDates() {
    let childElemCount = this.querySelector('.calendar-body').childElementCount;
    //7 lines
    if (childElemCount > 42) {
      let diff = 49 - childElemCount;
      this.loopThroughNextDays(diff);
    }

    //6 lines
    if (childElemCount > 35 && childElemCount <= 42) {
      let diff = 42 - childElemCount;
      this.loopThroughNextDays(42 - childElemCount);
    }

  }
  loopThroughNextDays(count) {
    if (count > 0) {
      for (let i = 1; i <= count; i++) {
        this.querySelector('.calendar-body').innerHTML += `<div class="next-dates">${i}</div>`;
      }
    }
  }
  attachEventsOnNextPrev() {
    this.plotDates();
    this.attachEvents();
  }
  init() {
    this.plotSelectors();
    this.plotDates();
    this.attachEvents();
  }
  connectedCallback() {
    this.init()
  }
}
customElements.define('calendar-element', Calendar);

class ContactForm extends HTMLElement {
  constructor(){
    super();
    this.zipEle = this.querySelector('.efo-input-zip');
    this.searchAddressBtn = this.querySelector('.efo-search-address')
    this.address = this.querySelector('#pref')
    this.fields = this.querySelectorAll('input:not(.efo-input-zip),select');
    this.inputZip = this.querySelector('.efo-input-zip');
  }
  connectedCallback() {
    this.searchAddressBtn.addEventListener('click',this.searchAddress.bind(this))
    this.inputZip.addEventListener('change',this.enterZip.bind(this))
    this.inputZip.addEventListener('blur',this.enterZip.bind(this))
    this.fields.forEach(field => {
      field.addEventListener('change',this.fieldChange.bind(this))
      field.addEventListener('blur',this.fieldChange.bind(this))
    })
  }
  async enterZip(e){
    if(/^\d{7}$/.test(e.target.value)){
      var first = e.target.value.slice(0,3);
      e.target.value = e.target.value.replace(first,first+'-')
    }
    if(e.target.value.length == 8 && /^\d{3}-\d{4}$/.test(e.target.value)){
      e.target.classList.remove('input-ng')
      AjaxZip3.zip2addr(this.zipEle,'','pref','address', '', '', false)
      this.inputZip.parentElement.querySelector('p').classList.remove('error');
      this.inputZip.parentElement.querySelector('p').innerText = ''
      await setTimeout(() => {
        this.querySelector('#pref').dispatchEvent(new Event('change'))
        this.querySelector('#address').dispatchEvent(new Event('change'))
      },500)
    }else{
      this.inputZip.parentElement.querySelector('p').classList.add('error');
      this.inputZip.parentElement.querySelector('p').innerText = '半角数字・ハイフンなしで入力してください。'
      e.target.classList.add('input-ng')
    }
  }
  async searchAddress(){
    await AjaxZip3.zip2addr(this.zipEle.value.replace('-',''),'','pref','address', '', '', false)
    setTimeout(() => {
      this.querySelector('#pref').dispatchEvent(new Event('change'))
      this.querySelector('#address').dispatchEvent(new Event('change'))
    },500)
  }
  fieldChange(e){
    if(e.target.value == ''){
      e.target.classList.add('input-ng')
    }else{
      if(e.target.name == 'tel'){
        // const phoneRegex = /^0\d{9}$|^0\d{2}-\d{3}-\d{4}$/;
        const phoneRegex = /^0\d{1,3}-\d{2,4}-\d{3,4}$/;

        if(e.target.value.length == 10){
          e.target.value = `${e.target.value.slice(0,3)}-${e.target.value.slice(3,6)}-${e.target.value.slice(6,10)}`
        }
        if(phoneRegex.test(e.target.value)){
          e.target.classList.remove('input-ng')
          e.target.parentElement.querySelector('p').classList.remove('error');
          e.target.parentElement.querySelector('p').innerText = ''
        }else{
          e.target.classList.add('input-ng')
          e.target.parentElement.querySelector('p').classList.add('error');
          e.target.parentElement.querySelector('p').innerText = '半角数字・ハイフンなしで入力してください。'
        }
      }else if(e.target.name == "email"){
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(emailRegex.test(e.target.value)){
          e.target.classList.remove('input-ng')
          e.target.parentElement.querySelector('p').classList.remove('error');
          e.target.parentElement.querySelector('p').innerText = ''
        }else{
          e.target.classList.add('input-ng')
          e.target.parentElement.querySelector('p').classList.add('error');
          e.target.parentElement.querySelector('p').innerText = '不正なメールアドレスです。（例：sample@sample.com）'
        }
      }else{
        e.target.classList.remove('input-ng')
      }

      
      
    }
  }
}
customElements.define('contact-form', ContactForm);

class RegisterForm extends HTMLElement {
  constructor(){
    super();
    this.zipEle = this.querySelector('.efo-input-zip');
    this.searchAddressBtn = this.querySelector('.efo-search-address')
    this.address = this.querySelector('#pref')
    this.fields = this.querySelectorAll('input:not(.efo-input-zip),select');
    this.inputZip = this.querySelector('.efo-input-zip');
    this.showPassBtn = this.querySelector('.js-action-pass-switch-type-btn');
    this.button = this.querySelector('button[type="submit"]');
    this.form = this.querySelector('form');
    this.key = CryptoJS.enc.Utf8.parse('VxYe84B7zSj4PHsr'); // 16 ký tự
    this.iv = CryptoJS.enc.Utf8.parse('eLyUW4vttpvQdZsf');  // 16 ký tự
    this.readTermsOfService = false;
    this.readPrivacyPolicy = false;
  }
  connectedCallback() {
    this.searchAddressBtn.addEventListener('click',this.searchAddress.bind(this))
    this.inputZip.addEventListener('change',this.enterZip.bind(this))
    this.inputZip.addEventListener('blur',this.enterZip.bind(this))
    this.showPassBtn.addEventListener('click',this.showPassword.bind(this))
    this.fields.forEach(field => {
      field.addEventListener('change',this.fieldChange.bind(this))
      field.addEventListener('blur',this.fieldChange.bind(this))
    })
    this.form.addEventListener('submit',this.submit.bind(this));
    if(location.search != ""){
      var encryptedText = location.search.replace('?','');
      var decrypt = this.decryptAES128CBC(encryptedText, this.key, this.iv);
      decrypt.split('&').forEach(param => {
        var entries = param.split('=');
        var key = entries[0].trim();
        var value = entries[1];
        switch (key) {
          case 'MINO':
            this.querySelector('[name="mino"]').value = value;
            break;
          case 'CKTR':
            this.querySelector('[name="cktr"]').value = value;
            break;
          case 'RANK':
            this.querySelector('[name="rank"]').value = value;
            break;
          default:
            if(key.includes('HMK')){
              this.querySelector('#'+key).checked = value == '1'
            }
            break;
        }
      })
    }
    this.querySelector('#scroll-terms-of-service').addEventListener('scroll',this.scrollTermsOfService.bind(this));
    this.querySelector('#scroll-privacy-policy').addEventListener('scroll',this.scrollPrivacyPolicy.bind(this));
  
    const formUseStartDate = document.getElementById('form_use_start_date');
    const inputTriggerForm = document.getElementById('inputTriggerForm');
    $('.js-datepicker').datepicker({
      dateFormat: "yy/mm/dd",
      onSelect: function(dateText) {
          if (formUseStartDate) {
            if (this.value === '') {
                inputTriggerForm.value = (Math.random() + 1).toString(36).substring(7);
                formUseStartDate.classList.add('required');
                formUseStartDate.classList.add('input-ng');
            } else {
                inputTriggerForm.value = (Math.random() + 1).toString(36).substring(7);
                formUseStartDate.classList.remove('required');
                formUseStartDate.classList.remove('input-ng');
                this.parentElement.querySelector('p').classList.remove('error')
            }
         }
      }
    });
  }
  scrollTermsOfService(e){
    if(e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight <= 1){
      this.readTermsOfService = true;
    }
    if(this.readTermsOfService && this.readPrivacyPolicy){
      this.querySelector('#form_privacy_agreement').removeAttribute('disabled')
    }
  }
  scrollPrivacyPolicy(e){
    if(e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight <= 1){
      this.readPrivacyPolicy = true;
    }
    if(this.readTermsOfService && this.readPrivacyPolicy){
      this.querySelector('#form_privacy_agreement').removeAttribute('disabled')
    }
  }
  submit(e){
    e.preventDefault();
    var formData = new FormData(this.form);
    var data = Object.fromEntries(formData.entries());
    document.querySelector('[name="customer[email]"]').value = data.email;
    document.querySelector('[name="customer[password]"]').value = data.password;
    document.querySelector('[name="customer[first_name]"]').value = data.first_name;
    document.querySelector('[name="customer[last_name]"]').value = data.last_name;
    document.querySelector('[name="customer[phone]"]').value = data.tel1 + data.tel2 + data.tel3;
    var note = ``;
    Object.entries(data).forEach(field => {
      if(field[1] != '' && field[0] != 'tel1' && field[0] != 'tel2' && field[0] != 'tel3' && field[0] != 'email' && field[0] != 'password' && field[0] != 'first_name' && field[0] != 'last_name' && field[0] != 'hmk' && field[0].indexOf('birth') == -1){
        note += `${field[0]}:${field[1]}\n`
      }
    })
    var hmk = [];
    this.querySelectorAll('input[name="hmk"]').forEach(checkbox => {
      if(checkbox.checked) {
        hmk.push(checkbox.value)
      }
    })
    note += `birthday:${data.birth_year}-${data.birth_month}-${data.birth_day}\n`;
    note += `hmk: ${hmk.join(',')}\n`;
    document.querySelector('[name="customer[note]"]').value = note;
    document.querySelector('#register-form button').click()
  }
  showPassword(){
    this.querySelector('#form_password').type = "text";
  }
  async enterZip(e){
    if(/^\d{7}$/.test(e.target.value)){
      var first = e.target.value.slice(0,3);
      e.target.value = e.target.value.replace(first,first+'-')
    }
    if(e.target.value.length == 8 && /^\d{3}-\d{4}$/.test(e.target.value)){
      e.target.classList.remove('input-ng')
      AjaxZip3.zip2addr(this.zipEle,'','pref','address', '', '', false)
      this.inputZip.parentElement.querySelector('p').classList.remove('error');
      this.inputZip.parentElement.querySelector('p').innerText = ''
      await setTimeout(() => {
        this.querySelector('#pref').dispatchEvent(new Event('change'))
        this.querySelector('#address').dispatchEvent(new Event('change'))
      },500)
    }else{
      this.inputZip.parentElement.querySelector('p').classList.add('error');
      this.inputZip.parentElement.querySelector('p').innerText = '半角数字・ハイフンなしで入力してください。'
      e.target.classList.add('input-ng')
    }
  }
  fieldChange(e){
    if(e.target.value == ''){
      if(!e.target.classList.contains('input-ng')){
        e.target.classList.add('input-ng');
      }
      if(e.target.name == "furigana_first_name" || e.target.name == "furigana_last_name"){
          e.target.parentElement.querySelector('p').classList.remove('error');
          e.target.parentElement.querySelector('p').innerText = ''    
      }
    }else{
      if(e.target.name == 'tel1' || e.target.name == 'tel2' || e.target.name == 'tel3'){
        if(e.target.name == 'tel1'){
          var phoneRegex = /^0\d{1,3}$/;
        }else if(e.target.name == 'tel2'){
          var phoneRegex = /^\d{2,4}$/;
        }else{
          var phoneRegex = /^\d{3,4}$/;
        }
        if(phoneRegex.test(e.target.value)){
          e.target.classList.remove('input-ng')
          e.target.parentElement.querySelector('p').classList.remove('error');
          e.target.parentElement.querySelector('p').innerText = ''
        }else{
          e.target.classList.add('input-ng')
          e.target.parentElement.querySelector('p').classList.add('error');
          e.target.parentElement.querySelector('p').innerText = '入力内容にお間違いがないか確認してください。'
        }
      }else if(e.target.name == "email"){
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(emailRegex.test(e.target.value)){
          e.target.classList.remove('input-ng')
          e.target.parentElement.querySelector('p').classList.remove('error');
          e.target.parentElement.querySelector('p').innerText = ''
        }else{
          e.target.classList.add('input-ng')
          e.target.parentElement.querySelector('p').classList.add('error');
          e.target.parentElement.querySelector('p').innerText = '不正なメールアドレスです。（例：sample@sample.com）'
        }
      }else if(e.target.name == "password"){
        const passwordRegex = /^(?=.*?[a-z])(?=.*?\d)[a-z\,\.\_\-\/\(\)\{\}\d]{8,16}$/i;
        if(passwordRegex.test(e.target.value)){
          e.target.classList.remove('input-ng')
          e.target.parentElement.querySelector('p').classList.remove('error');
          e.target.parentElement.querySelector('p').innerText = ''
        }else{
          e.target.classList.add('input-ng')
          e.target.parentElement.querySelector('p').classList.add('error');
          e.target.parentElement.querySelector('p').innerText = '8文字以上16文字以下で半角英数字をそれぞれ1文字以上含んでください。使える記号は『 , . _ - / () {} 』です。'
        }
      }else if(e.target.name == "furigana_first_name" || e.target.name == "furigana_last_name"){
         const furiganaRegex = /^[\u30A0-\u30FF]+$/;
          if(furiganaRegex.test(e.target.value)){
            e.target.classList.remove('input-ng')
            e.target.parentElement.querySelector('p').classList.remove('error');
            e.target.parentElement.querySelector('p').innerText = ''
          }else{
            e.target.classList.add('input-ng')
            e.target.parentElement.querySelector('p').classList.add('error');
            e.target.parentElement.querySelector('p').innerText = '全角カタカナで入力してください'
          }
      }else if(e.target.name == 'job'){
        const iconRequired = document.createElement('i');
        iconRequired.classList.add('icon-required');
        if (e.target.value === '法人') {
          this.querySelector('#form_company').classList.add('required');
          if(this.querySelector('#form_company').value == '' && !this.querySelector('#form_company').classList.contains('input-ng')){
            this.querySelector('#form_company').classList.add('input-ng');
          }
          if(this.querySelector('#companyName .efo-input-title .icon-required') == null){
            this.querySelector('#companyName .efo-input-title').appendChild(iconRequired);
          }
        } else {
          this.querySelector('#form_company').classList.remove('required', 'input-ng');
          this.querySelector('#companyName .efo-input-title i')?.remove()
        }
      }else if(e.target.name == "use_start_date_select"){
        const dateRegex = /^(19|20)\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/;
        if(dateRegex.test(e.target.value)){
          e.target.classList.remove('input-ng')
          e.target.parentElement.querySelector('p').classList.remove('error');
          e.target.parentElement.querySelector('p').innerText = ''
        }else{
          e.target.classList.add('input-ng')
          e.target.parentElement.querySelector('p').classList.add('error');
          e.target.parentElement.querySelector('p').innerText = 'YYYY/MM/DD形式（例：2013/01/08）で入力してください。'
        }
      }else{
        e.target.classList.remove('input-ng')
      }
    }
    if(e.target.id == 'form_birth_year'){
      this.querySelector('label[for="form_birth_year"]').innerText = e.target.value
    }
    if(e.target.id == 'form_birth_month'){
      this.querySelector('label[for="form_birth_month"]').innerText = e.target.value
    }
    if(e.target.id == 'form_birth_day'){
      this.querySelector('label[for="form_birth_day"]').innerText = e.target.value
    }
    var isValid = true;
    this.querySelectorAll('.required').forEach(field => {
      if (field.value == "" || field.value == null) {
        isValid = false;
      }
    })
    if(isValid && this.querySelectorAll('.efo-input-message.error').length == 0 && this.querySelector('#form_privacy_agreement').checked){
      this.button.removeAttribute('disabled')
      this.button.innerText = '登録する'
    }else{
      this.button.setAttribute('disabled',true)
      this.button.innerText = '未入力の項目があります'
    }
  }
  async searchAddress(){
    await AjaxZip3.zip2addr(this.zipEle.value.replace('-',''),'','pref','address', '', '', false)
    setTimeout(() => {
      this.querySelector('#pref').dispatchEvent(new Event('change'))
      this.querySelector('#address').dispatchEvent(new Event('change'))
    },500)
  }
  encryptAES128CBC(text, key, iv) {
    const encrypted = CryptoJS.AES.encrypt(text, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString(); // Kết quả base64
  }
  decryptAES128CBC(encrypted, key, iv) {
    const bytes = CryptoJS.AES.decrypt(encrypted, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
customElements.define('register-form', RegisterForm);
class EditInfomationForm extends HTMLElement {
  constructor(){
    super();
    this.zipEle = this.querySelector('.efo-input-zip');
    this.searchAddressBtn = this.querySelector('.efo-search-address')
    this.address = this.querySelector('#pref')
    this.fields = this.querySelectorAll('input:not(.efo-input-zip),select');
    this.inputZip = this.querySelector('.efo-input-zip');
    this.showPassBtn = this.querySelector('.js-action-pass-switch-type-btn');
    this.button = this.querySelector('button[type="submit"]');
    this.form = this.querySelector('form');
    this.form.addEventListener('submit',this.submit.bind(this));
  }
  connectedCallback() {
    this.searchAddressBtn.addEventListener('click',this.searchAddress.bind(this))
    this.inputZip.addEventListener('change',this.enterZip.bind(this))
    this.inputZip.addEventListener('blur',this.enterZip.bind(this))
    this.fields.forEach(field => {
      field.addEventListener('change',this.fieldChange.bind(this))
      field.addEventListener('blur',this.fieldChange.bind(this))
    })
    AjaxZip3.zip2addr(this.zipEle,'','pref','address', '', '', false);
    var isValid = true;
    this.querySelectorAll('.required').forEach(field => {
      if (field.value == "" || field.value == null) {
        isValid = false;
      }
    })
    if(isValid && this.querySelectorAll('.efo-input-message.error').length == 0){
      this.button.removeAttribute('disabled')
      this.button.innerText = '変更する'
    }else{
      this.button.setAttribute('disabled',true)
      this.button.innerText = '未入力の項目があります'
    }
    // document.getElementById('form_firstkana').value = wanakana.toKatakana(document.getElementById('form_firstname').value)
    // document.getElementById('form_lastkana').value = wanakana.toKatakana(document.getElementById('form_lastname').value)
  }
  submit(e){
    e.preventDefault();
    var formData = new FormData(this.form);
    var data = Object.fromEntries(formData.entries());
    var note = ``;
    Object.entries(data).forEach(field => {
      if(field[1] != '' && field[0] != 'password' && field[0] != 'first_name' && field[0] != 'last_name' && field[0] != 'hmk' && field[0].indexOf('birth') == -1){
        note += `${field[0]}:${field[1]}\n`
      }
    })
    document.querySelector('#infomation-form [name="contact[first_name]"]').value = document.getElementById('form_firstname').value;
    document.querySelector('#infomation-form [name="contact[last_name]"]').value = document.getElementById('form_lastname').value;
    document.querySelector('[name="contact[note]"]').value = note;
    document.querySelector('#infomation-form').submit()
  }
  async enterZip(e){
    if(/^\d{7}$/.test(e.target.value)){
      var first = e.target.value.slice(0,3);
      e.target.value = e.target.value.replace(first,first+'-')
    }
    if(e.target.value.length == 8 && /^\d{3}-\d{4}$/.test(e.target.value)){
      e.target.classList.remove('input-ng')
      AjaxZip3.zip2addr(this.zipEle,'','pref','address', '', '', false)
      this.inputZip.parentElement.querySelector('p').classList.remove('error');
      this.inputZip.parentElement.querySelector('p').innerText = ''
      await setTimeout(() => {
        this.querySelector('#pref').dispatchEvent(new Event('change'))
        this.querySelector('#address').dispatchEvent(new Event('change'))
      },500)
    }else{
      this.inputZip.parentElement.querySelector('p').classList.add('error');
      this.inputZip.parentElement.querySelector('p').innerText = '半角数字・ハイフンなしで入力してください。'
      e.target.classList.add('input-ng')
    }
  }
  fieldChange(e){
    if(e.target.value == ''){
      e.target.classList.add('input-ng')
    }else{
      if(e.target.name == 'tel'){
        // const phoneRegex = /^0\d{9}$|^0\d{2}-\d{3}-\d{4}$/;
        const phoneRegex = /^0\d{1,3}-\d{2,4}-\d{3,4}$/;

        if(e.target.value.length == 10){
          e.target.value = `${e.target.value.slice(0,3)}-${e.target.value.slice(3,6)}-${e.target.value.slice(6,10)}`
        }
        if(phoneRegex.test(e.target.value)){
          e.target.classList.remove('input-ng')
          e.target.parentElement.querySelector('p').classList.remove('error');
          e.target.parentElement.querySelector('p').innerText = ''
        }else{
          e.target.classList.add('input-ng')
          e.target.parentElement.querySelector('p').classList.add('error');
          e.target.parentElement.querySelector('p').innerText = '半角数字・ハイフンなしで入力してください。'
        }
      }else if(e.target.name == "email"){
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(emailRegex.test(e.target.value)){
          e.target.classList.remove('input-ng')
          e.target.parentElement.querySelector('p').classList.remove('error');
          e.target.parentElement.querySelector('p').innerText = ''
        }else{
          e.target.classList.add('input-ng')
          e.target.parentElement.querySelector('p').classList.add('error');
          e.target.parentElement.querySelector('p').innerText = '不正なメールアドレスです。（例：sample@sample.com）'
        }
      }else if(e.target.name == "password"){
        const passwordRegex = /^(?=.*?[a-z])(?=.*?\d)[a-z\,\.\_\-\/\(\)\{\}\d]{8,16}$/i;
        if(passwordRegex.test(e.target.value)){
          e.target.classList.remove('input-ng')
          e.target.parentElement.querySelector('p').classList.remove('error');
          e.target.parentElement.querySelector('p').innerText = ''
        }else{
          e.target.classList.add('input-ng')
          e.target.parentElement.querySelector('p').classList.add('error');
          e.target.parentElement.querySelector('p').innerText = '8文字以上16文字以下で半角英数字をそれぞれ1文字以上含んでください。使える記号は『 , . _ - / () {} 』です。'
        }
      }else{
        e.target.classList.remove('input-ng')
      }
    }
    if(e.target.id == 'form_birth_year'){
      this.querySelector('label[for="form_birth_year"]').innerText = e.target.value
    }
    if(e.target.id == 'form_birth_month'){
      this.querySelector('label[for="form_birth_month"]').innerText = e.target.value
    }
    if(e.target.id == 'form_birth_day'){
      this.querySelector('label[for="form_birth_day"]').innerText = e.target.value
    }
    var isValid = true;
    this.querySelectorAll('.required').forEach(field => {
      if (field.value == "" || field.value == null) {
        isValid = false;
      }
    })
    if(isValid && this.querySelectorAll('.efo-input-message.error').length == 0){
      this.button.removeAttribute('disabled')
      this.button.innerText = '変更する'
    }else{
      this.button.setAttribute('disabled',true)
      this.button.innerText = '未入力の項目があります'
    }
  }
  async searchAddress(){
    await AjaxZip3.zip2addr(this.zipEle.value.replace('-',''),'','pref','address', '', '', false)
    setTimeout(() => {
      this.querySelector('#pref').dispatchEvent(new Event('change'))
      this.querySelector('#address').dispatchEvent(new Event('change'))
    },500)
  }
  encryptAES128CBC(text, key, iv) {
    const encrypted = CryptoJS.AES.encrypt(text, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString(); // Kết quả base64
  }
  decryptAES128CBC(encrypted, key, iv) {
    const bytes = CryptoJS.AES.decrypt(encrypted, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
customElements.define('infomation-form', EditInfomationForm);
document.querySelectorAll('.custom-dropdown').forEach((box) => {
  var button = box.querySelector('.dropdown-button');
  var menu = box.querySelector('.dropdown-menu');
  button.addEventListener('click', function () {
    menu.classList.toggle('active');
  })
})
document.addEventListener('click', (e) => {
  if (!e.target.classList.contains('dropdown-button')) {
    document.querySelectorAll('.custom-dropdown').forEach((box) => {
      var menu = box.querySelector('.dropdown-menu');
      menu.classList.remove('active')
    })
  }
})
// メインアコーディオンの制御（常にオープンのセクションはスクリプト対象外）
document.querySelectorAll('.accordion').forEach((div) => {
  div.addEventListener('click', () => {
    const panel = document.getElementById(div.dataset.toggle);
    const isOpen = panel.classList.contains('open');

    // 他のメインパネルを閉じる
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('open'));
    document.querySelectorAll('.accordion').forEach((b) => b.classList.remove('open'));

    // 選択されたパネルを切り替え
    if (!isOpen) {
      panel.classList.add('open');
      div.classList.add('open');
    }
  });
});

// サブカテゴリアコーディオンの制御
document.querySelectorAll('.sub-accordion').forEach((div) => {
  div.addEventListener('click', function (event) {
    if (event.target.tagName === 'A' && event.target.classList.contains('parent-a')) {
      return;
    }
    
    const subPanel = div.parentNode.querySelector('.sub-panel');
    subPanel.classList.toggle('open');
    div.classList.toggle('open');
  });
});
if(document.getElementById('searchKeyNo')){
  var url = new URL(window.location.href)
  var params = url.searchParams;
  if(params.get('filter.p.m.custom.production_period') != '' && params.get('filter.p.m.custom.production_period') != null){
    document.querySelector('.cate_leftmenu .input-keyno').value = window.localStorage.getItem('keyno')
  }
  const searchKeyNo = async () => {
    var keyno = document.querySelector('.cate_leftmenu .input-keyno').value;
    var year = 2014;
    var url = window.location.href = '/collections/all?filter.p.m.custom.production_period='+keyno;
    for await (const i of [0,1]) {
      var latinh = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for await (const c of latinh) {
        var key = i+c;
        if(keyno.slice(-2) == key){
          window.localStorage.setItem('keyno',keyno)
          url = '/collections/all?filter.p.m.custom.production_period='+year;
          break;
        }
        year++;
      }
    }
    window.localStorage.setItem('keyno',keyno)
    window.location.href = url
  }
  document.querySelector('.cate_leftmenu .input-keyno').addEventListener('keyup', (event) => {
    if(event.key == 'Enter' || event.keyCode === 13){
      event.preventDefault()
      searchKeyNo()
    }
  })
  document.getElementById('searchKeyNo').addEventListener('click',searchKeyNo)
  document.querySelector('.search-keyno-form').addEventListener('submit',(event) => {
    event.preventDefault();
    searchKeyNo()
  })
}

async function fetchSwatch(cursor = null){
  var query = `{ metaobjects(type: "product_color_mapping", first: 50) { pageInfo { hasNextPage endCursor } nodes { handle fields { key value }}}}`;
  if(cursor != null){
    query = `{ metaobjects(after: "${cursor}",type: "product_color_mapping", first: 50) { pageInfo { hasNextPage endCursor } nodes { handle fields { key value }}}}`;
  }
  return await fetch('https://woodone-shuei-prd.myshopify.com/api/2025-01/graphql.json',{
    headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': '00e0c0894ba6406c5678ef4a26795fd4'
    },
    method: 'POST',
    body: JSON.stringify({
        query
    })
  }).then(res => res.json()).then(res => res.data)
}
document.addEventListener('DOMContentLoaded',async () => {
  var hasNext = false;
  var cursor = null;
  var swatches = [];
  do{
    if(cursor != null){
      var result = await fetchSwatch(cursor);
    }else{
      var result = await fetchSwatch();
    }
    hasNext = result.metaobjects.pageInfo.hasNextPage;
    cursor = result.metaobjects.pageInfo.endCursor;
    swatches = [...swatches, ...result.metaobjects.nodes];
  }while(hasNext)
    document.querySelectorAll('.product-item.grid__item').forEach(pro => {
      pro.querySelectorAll('.dropdown-item.color').forEach(option => {
        var value = option.querySelector('span').innerText;
        var swatch = swatches.find(s => s.fields[1].value == value);
        if(swatch){
          if(option.querySelector('.variant-selector__color') == null){
            option.innerHTML = `<div class="color-swatch__item" style="background-color: ${swatch.fields[0].value}">●</div></span>${value}`
          }
        }
      })
    })
  
})