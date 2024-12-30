class VariantSelectors extends HTMLElement {
  constructor() {
    super();
    this.buttons = this.querySelectorAll('.variant-selector__button');
    this.dropdowns = this.querySelectorAll('.variant-selector__dropdown');
    this.variantSelect = this.querySelector('[data-variant-select]');
    this.productForm = document.querySelector(`#product-form-${this.dataset.section}`);
    
    try {
      this.colorMappings = JSON.parse(this.dataset.colorMappings || '{}');
      this.normalizedColorMappings = Object.fromEntries(
        Object.entries(this.colorMappings).map(([key, value]) => [
          this.normalizeString(key),
          value
        ])
      );
      
      this.setInitialColors();
    } catch (e) {
      console.error('Error parsing color mappings:', e);
      this.normalizedColorMappings = {};
    }

    this.setupEventListeners();
    this.setupInitialState();
  }

  setupInitialState() {
    const urlParams = new URLSearchParams(window.location.search);
    const variantId = urlParams.get('variant') || this.variantSelect?.value;
    
    if (variantId && this.variantSelect) {
      const option = Array.from(this.variantSelect.options).find(opt => opt.value === variantId);
      if (option) {
        Array.from(this.variantSelect.options).forEach(opt => opt.selected = false);
        option.selected = true;
        
        const variantTitle = option.text;
        const variantValues = variantTitle.split(' / ');
        this.updateButtonsAndDropdowns(variantValues);
      }
    }
  }

  normalizeString(str) {
    return str
      .replace(/[（）]/g, '')
      .replace(/[()]/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  getColorForValue(value) {
    const normalizedValue = this.normalizeString(value);
    return this.normalizedColorMappings[normalizedValue];
  }

  setInitialColors() {
    const colorElements = this.querySelectorAll('[data-color-value]');
    colorElements.forEach(colorElement => {
      const colorValue = colorElement.getAttribute('data-color-value');
      const color = this.getColorForValue(colorValue);
      if (color) {
        colorElement.style.setProperty('--variant-color', color);
      }
    });

    this.buttons.forEach(button => {
      const activeColorElement = button.querySelector('[data-color]');
      if (activeColorElement) {
        const currentVariantColor = button.querySelector('[data-option-text]')?.textContent.trim();
        const color = this.getColorForValue(currentVariantColor);
        if (color) {
          activeColorElement.style.setProperty('--variant-color', color);
        }
      }
    });
  }

  setupEventListeners() {
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      this.closeAllDropdowns();
    });

    // Button click handlers
    this.buttons.forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const dropdown = button.nextElementSibling;
        const isOpen = dropdown.classList.contains('is-open');
        
        this.closeAllDropdowns();

        if (!isOpen) {
          dropdown.classList.add('is-open');
        }
      });
    });

    // Option click handlers
    this.dropdowns.forEach((dropdown, index) => {
      const button = dropdown.previousElementSibling;
      const options = dropdown.querySelectorAll('.variant-selector__option');

      options.forEach(option => {
        option.addEventListener('click', () => {
          const selectedValue = option.getAttribute('data-value');
          const textElement = button.querySelector('[data-option-text]');
          textElement.textContent = selectedValue;

          const activeColorElement = button.querySelector('[data-color]');
          if (activeColorElement) {
            const color = this.getColorForValue(selectedValue);
            if (color) {
              activeColorElement.style.setProperty('--variant-color', color);
            }
          }

          options.forEach(opt => opt.classList.remove('selected'));
          option.classList.add('selected');

          this.updateVariantSelection(index, selectedValue);
          dropdown.classList.remove('is-open');
        });
      });
    });

    // Listen for variant:changed event
    document.addEventListener('variant:changed', (event) => {
      if (event.detail.variant && this.variantSelect) {
        const variantId = event.detail.variantId;
        const option = Array.from(this.variantSelect.options).find(opt => opt.value === variantId);
        
        if (option) {
          Array.from(this.variantSelect.options).forEach(opt => opt.selected = false);
          option.selected = true;
          
          const variantValues = option.text.split(' / ');
          this.updateButtonsAndDropdowns(variantValues);
        }
      }
    });

    // Handle select change
    this.variantSelect.addEventListener('change', (event) => {
      const selectedOption = event.target.options[event.target.selectedIndex];
      const variantValues = selectedOption.text.split(' / ');
      this.updateButtonsAndDropdowns(variantValues);
    });
  }

  closeAllDropdowns() {
    this.dropdowns.forEach(dropdown => {
      dropdown.classList.remove('is-open');
    });
  }

  updateVariantSelection(optionIndex, value) {
    const selections = Array.from(this.buttons).map(button => 
      button.querySelector('[data-option-text]').textContent.trim()
    );
    selections[optionIndex] = value;

    const matchingOption = Array.from(this.variantSelect.options).find(option => {
      const variantValues = option.text.split(' / ');
      return variantValues.every((val, index) => val.trim() === selections[index]);
    });

    if (matchingOption) {
      Array.from(this.variantSelect.options).forEach(opt => opt.selected = false);
      matchingOption.selected = true;

      if (history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', matchingOption.value);
        window.history.replaceState({ path: url.href }, '', url.href);
      }

      const changeEvent = new CustomEvent('change', {
        bubbles: true,
        detail: {
          variant: {
            id: matchingOption.value,
            title: matchingOption.text,
            optionValues: selections
          }
        }
      });
      this.variantSelect.dispatchEvent(changeEvent);
    }
  }

  updateButtonsAndDropdowns(variantValues) {
    this.buttons.forEach((button, index) => {
      const selectedValue = variantValues[index]?.trim();
      if (!selectedValue) return;

      // Update button text
      const textElement = button.querySelector('[data-option-text]');
      if (textElement) {
        textElement.textContent = selectedValue;
      }

      // Update color if exists
      const colorElement = button.querySelector('[data-color]');
      if (colorElement) {
        const color = this.getColorForValue(selectedValue);
        if (color) {
          colorElement.style.setProperty('--variant-color', color);
        }
      }

      // Update dropdown options
      const dropdown = button.nextElementSibling;
      const options = dropdown.querySelectorAll('.variant-selector__option');
      options.forEach(option => {
        const value = option.getAttribute('data-value');
        if (value === selectedValue) {
          option.classList.add('selected');
        } else {
          option.classList.remove('selected');
        }
      });
    });
  }
}

customElements.define('variant-selectors', VariantSelectors);