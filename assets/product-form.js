if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');
        this.selectOptions = this.querySelectorAll('.dropdown-select');
        this.variants = JSON.parse(this.querySelector('[type="application/json"]').innerHTML)

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';

        this.selectOptions.forEach(opt => {
          opt.addEventListener('change', this.onSelectChange.bind(this));
        })
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    this.cart.renderContents(response);
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              this.cart.renderContents(response);
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      onSelectChange(e){
        function arraysAreEqual(arr1, arr2) {
          if (arr1.length !== arr2.length) {
            return false;
          }
        
          for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) {
              return false;
            }
          }
        
          return true;
        }
        var options = [];
        this.selectOptions.forEach(o => options.push(o.value));
        var selected_variant = this.variants.find(v => {
          return arraysAreEqual(v.options, options);
        })
        this.form.querySelector('[name=id]').value = selected_variant.id
        if(selected_variant.featured_image != null){
          this.closest('.product-item').querySelector('.cate-item-img a img').src = selected_variant.featured_image.src
          this.closest('.product-item').querySelector('.cate-item-img a img').setAttribute('srcset',selected_variant.featured_image.src)
        }
        this.closest('.product-item').querySelector('.period').innerText = selected_variant.sku
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}

document.querySelectorAll('.toggle-cart').forEach(button => {
  button.addEventListener('click', () => {
    const cartArea = button.nextElementSibling;
    const isVisible = cartArea.style.display === 'block';
    document.querySelectorAll('.cart-area').forEach(area => area.style.display = 'none');
    cartArea.style.display = isVisible ? 'none' : 'block';
  });
});

document.addEventListener('click', (event) => {
  const isClickInside = event.target.closest('.cart-area-wrap');
  if (!isClickInside) {
    document.querySelectorAll('.cart-area').forEach(area => area.style.display = 'none');
  }
});


/*カスタムドロップダウン*/
// ドロップダウンのすべてのボタンにクリックイベントを設定
document.querySelectorAll('.dropdown-button').forEach((button) => {
  button.addEventListener('click', function () {
    const dropdown = this.nextElementSibling;

    // 他のドロップダウンを閉じる
    document.querySelectorAll('.dropdown-menu').forEach((menu) => {
      if (menu !== dropdown) {
        menu.style.display = 'none';
      }
    });

    // 現在のドロップダウンを切り替え
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  });
});

// 各ドロップダウンのアイテムにクリックイベントを設定
document.querySelectorAll('.dropdown-item').forEach((item) => {
  item.addEventListener('click', function () {
    const dropdownMenu = this.closest('.dropdown-menu');
    const dropdownButton = dropdownMenu.previousElementSibling;

    // 選択された値をボタンに反映
    const selectedText = this.querySelector('span').textContent;
    dropdownButton.textContent = selectedText;

    // ドロップダウンを閉じる
    dropdownMenu.style.display = 'none';

    // 必要なら選択された値を処理
    console.log('選択された値:', this.getAttribute('data-value'));
  });
});

// ページのどこかをクリックしたときにドロップダウンを閉じる
document.addEventListener('click', function (event) {
  const isDropdown = event.target.closest('.custom-dropdown');

  if (!isDropdown) {
    document.querySelectorAll('.dropdown-menu').forEach((menu) => {
      menu.style.display = 'none';
    });
  }
});

