class CartTotalUpdater {
    constructor() {
      this.cartTotalElement = document.querySelector('[data-cart-total]');
      this.setupEventListeners();
      this.initQuantityButtons();
    }
  
    setupEventListeners() {
      document.addEventListener('product:added', this.updateCartTotal.bind(this));
      document.addEventListener('cart:update', this.updateCartTotal.bind(this));
      document.addEventListener('cart:remove', this.updateCartTotal.bind(this));
      document.addEventListener('cart:refresh', this.updateCartTotal.bind(this));

      const cartForms = document.querySelectorAll('form[action="/cart/add"]');
      cartForms.forEach(form => {
        form.addEventListener('submit', () => {
          setTimeout(() => this.updateCartTotal(), 200);
        });
      });
  

      document.addEventListener('change', (event) => {
        if (event.target.matches('[name="quantity"], [name="updates[]"]')) {
          setTimeout(() => this.updateCartTotal(), 200);
        }
      });

      this.updateCartTotal();
    }
  
    initQuantityButtons() {

      document.addEventListener('click', (event) => {
        if (event.target.matches('.quantity__button')) {
          setTimeout(() => this.updateCartTotal(), 200);
        }

        if (event.target.closest('cart-remove-button') || 
        event.target.closest('.button--tertiary')) {
          setTimeout(() => this.updateCartTotal(), 200);
        }
      });
  
      document.addEventListener('change', (event) => {
        if (event.target.matches('.quantity__input')) {
          setTimeout(() => this.updateCartTotal(), 200);
        }
      });
    }
  
    updateCartTotal() {
      fetch('/cart.js')
        .then(response => response.json())
        .then(cart => {
          if (this.cartTotalElement) {
            const formattedPrice = Shopify.formatMoney(cart.total_price);
            this.cartTotalElement.innerHTML = `Total: ${formattedPrice}`;
          }
        })
        .catch(error => console.error('Error fetching cart:', error));
    }

  }

  new CartTotalUpdater();