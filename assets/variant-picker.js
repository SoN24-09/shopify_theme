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
        this.variantSelect.value = variantId;
        const variantTitle = option.text;
        const variantValues = variantTitle.split(' / ');
        console.log("buttons",this.buttons);
        
        this.buttons.forEach((button, index) => {
          const textElement = button.querySelector('[data-option-text]');
          if (textElement && variantValues[index]) {
            textElement.textContent = variantValues[index].trim();
            console.log("textElement[index]",textElement);
            
            const activeColorElement = button.querySelector('[data-color]');
            if (activeColorElement) {
              const color = this.getColorForValue(variantValues[index]);
              if (color) {
                activeColorElement.style.backgroundColor = color;
              } else {
                activeColorElement.style.backgroundColor = 'transparent';
              }
            }
          }
        });
        
        this.renderVariantSection(variantId);
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
        colorElement.style.backgroundColor = color;
      } else {
        colorElement.style.backgroundColor = 'transparent';
      }
    });

    this.buttons.forEach(button => {
      const activeColorElement = button.querySelector('[data-color]');
      if (activeColorElement) {
        const currentVariantColor = button.querySelector('[data-option-text]')?.textContent.trim();
        const color = this.getColorForValue(currentVariantColor);
        if (color) {
          activeColorElement.style.backgroundColor = color;
        } else {
          activeColorElement.style.backgroundColor = 'transparent';
        }
      }
    });
  }

  setupEventListeners() {
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
              activeColorElement.style.backgroundColor = color;
            } else {
              activeColorElement.style.backgroundColor = 'transparent';
            }
          }

          this.updateVariantSelection(index, selectedValue);
          dropdown.classList.remove('is-open');
        });
      });
    });

    document.addEventListener('click', () => {
      this.closeAllDropdowns();
    });

    document.addEventListener('variant:changed', (event) => {
      if (event.target !== this) {
        this.onVariantChanged(event.detail);
      }
    });
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

    if (this.variantSelect) {
      const option = Array.from(this.variantSelect.options).find(option => {
        const variantTitle = option.text;
        const variantValues = variantTitle.split(' / ');
        console.log("variantValues",value);
        return variantValues[optionIndex].trim() === value;
      });

      if (option) {
        this.variantSelect.value = option.value;
        const variantInputs = document.querySelectorAll('input[name="id"]');
        variantInputs.forEach(input => {
          input.value = option.value;
        });
        
        const productForms = document.querySelectorAll('form[action*="/cart/add"]');
        productForms.forEach(form => {
          const currentAction = new URL(form.action, window.location.origin);
          if (currentAction.searchParams.has('variant')) {
            currentAction.searchParams.set('variant', option.value);
          }
          form.action = currentAction.toString();
        });

        const changeEvent = new CustomEvent('change', {
          bubbles: true,
          detail: {
            variant: {
              id: option.value,
              title: option.text,
              available: !option.disabled,
              optionValues: selections
            }
          }
        });
        this.variantSelect.dispatchEvent(changeEvent);

        if (history.replaceState) {
          const url = new URL(window.location.href);
          url.searchParams.set('variant', option.value);
          window.history.replaceState({ path: url.href }, '', url.href);
        }

        this.renderVariantSection(option.value);
      }
    }
  }

  async renderVariantSection(variantId) {
    const productInfo = this.closest('product-info');
    if (!productInfo) return;

    const sectionId = productInfo.dataset.section;
    const productUrl = window.location.pathname;

    try {
      const response = await fetch(`${productUrl}?variant=${variantId}&section_id=${sectionId}`);
      if (!response.ok) throw new Error(response.statusText);

      const html = await response.text();
      const parser = new DOMParser();
      const newDocument = parser.parseFromString(html, 'text/html');
      
      this.updatePriceElement(newDocument, sectionId);
      this.updateVariantInfo(newDocument, sectionId);
      this.updateInventoryStatus(newDocument, sectionId);
      this.updateMediaGallery(newDocument, sectionId);
      
      this.dispatchVariantChangeEvent(newDocument, sectionId, variantId);
    } catch (error) {
      console.error('Error updating variant:', error);
    }
  }

  updatePriceElement(newDocument, sectionId) {
    this.updateElement('price', newDocument, sectionId);
    this.updateElement('compare-price', newDocument, sectionId);
    this.updateElement('unit-price', newDocument, sectionId);
  }

  updateVariantInfo(newDocument, sectionId) {
    this.updateElement('Sku', newDocument, sectionId);
    this.updateElement('variant-title', newDocument, sectionId);
    this.updateElement('variant-barcode', newDocument, sectionId);
  }

  updateInventoryStatus(newDocument, sectionId) {
    this.updateElement('Inventory', newDocument, sectionId);
    this.updateElement('available', newDocument, sectionId);
  }

  updateElement(elementId, newDocument, sectionId) {
    const currentElement = document.getElementById(`${elementId}-${sectionId}`);
    const newElement = newDocument.getElementById(`${elementId}-${sectionId}`);
    
    if (currentElement && newElement) {
      currentElement.innerHTML = newElement.innerHTML;
      if (newElement.classList.contains('hidden')) {
        currentElement.classList.add('hidden');
      } else {
        currentElement.classList.remove('hidden');
      }
    }
  }

  updateMediaGallery(newDocument, sectionId) {
    const mediaGallery = document.querySelector('media-gallery');
    if (!mediaGallery) return;

    const mediaGallerySource = mediaGallery.querySelector('ul');
    const mediaGalleryDestination = newDocument.querySelector('media-gallery ul');

    if (mediaGallerySource && mediaGalleryDestination) {
      mediaGallerySource.innerHTML = mediaGalleryDestination.innerHTML;

      const variant = this.getSelectedVariantData(newDocument);
      if (variant?.featured_media?.id) {
        mediaGallery.setActiveMedia(`${sectionId}-${variant.featured_media.id}`, true);
      }

      const modalContent = document.querySelector(`#ProductModal-${this.dataset.section} .product-media-modal__content`);
      const newModalContent = newDocument.querySelector('product-modal .product-media-modal__content');
      if (modalContent && newModalContent) {
        modalContent.innerHTML = newModalContent.innerHTML;
      }
    }
  }

  getSelectedVariantData(content) {
    const variantData = content.querySelector('[data-selected-variant]')?.innerHTML;
    try {
      return variantData ? JSON.parse(variantData) : null;
    } catch (e) {
      console.error('Error parsing variant data:', e);
      return null;
    }
  }

  dispatchVariantChangeEvent(newDocument, sectionId, variantId) {
    const event = new CustomEvent('variant:changed', {
      bubbles: true,
      detail: {
        html: newDocument,
        sectionId: sectionId,
        variant: this.getSelectedVariantData(newDocument),
        variantId: variantId
      }
    });
    this.dispatchEvent(event);
  }

  onVariantChanged(detail) {
    if (detail.variant && detail.variant.optionValues) {
      this.buttons.forEach((button, index) => {
        const value = detail.variant.optionValues[index];
        const textElement = button.querySelector('[data-option-text]');
        if (textElement) {
          textElement.textContent = value;
        }

        // Update color when variant changes
        const colorElement = button.querySelector('[data-color]');
        if (colorElement) {
          const color = this.getColorForValue(value);
          if (color) {
            colorElement.style.backgroundColor = color;
          } else {
            colorElement.style.backgroundColor = 'transparent';
          }
        }
      });
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
          colorElement.style.backgroundColor = color;
        } else {
          colorElement.style.backgroundColor = 'transparent';
        }
      }

      // Update dropdown options
      const dropdown = button.nextElementSibling;
      const options = dropdown.querySelectorAll('.variant-selector__option');
      options.forEach(option => {
        const value = option.getAttribute('data-value');
        
        // Update option color
        const optionColorElement = option.querySelector('[data-color-value]');
        if (optionColorElement) {
          const optionColor = this.getColorForValue(value);
          if (optionColor) {
            optionColorElement.style.backgroundColor = optionColor;
          } else {
            optionColorElement.style.backgroundColor = 'transparent';
          }
        }
        
        // Update selected state
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
