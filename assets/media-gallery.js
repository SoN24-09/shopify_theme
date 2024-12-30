if (!customElements.get("media-gallery")) {
  customElements.define(
    "media-gallery",
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
        };
        this.mql = window.matchMedia("(min-width: 750px)");
        if (!this.elements.thumbnails) return;

        this.elements.viewer.addEventListener(
          "slideChanged",
          debounce(this.onSlideChanged.bind(this), 500)
        );
        this.elements.thumbnails
          .querySelectorAll("[data-target]")
          .forEach((mediaToSwitch) => {
            const button = mediaToSwitch.querySelector("button");
            button.addEventListener(
              "click",
              this.setActiveMedia.bind(
                this,
                button.id,
                mediaToSwitch.dataset.target,
                false
              )
            );
          });
        if (
          this.dataset.desktopLayout.includes("thumbnail") &&
          this.mql.matches
        )
          this.removeListSemantic();
      }

      onSlideChanged(event) {
        const thumbnail = this.elements.thumbnails.querySelector(
          `[data-target="${event.detail.currentElement.dataset.mediaId}"]`
        );
        this.setActiveThumbnail(thumbnail);
      }

      setActiveMedia(id, mediaId, prepend) {
        console.log(id);
        const activeMedia =
          this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
          this.elements.viewer.querySelector("[data-media-id]");
        if (!activeMedia) {
          return;
        }
        this.elements.viewer
          .querySelectorAll("[data-media-id]")
          .forEach((element) => {
            element.classList.remove("is-active");
          });
        activeMedia?.classList?.add("is-active");

        if (prepend) {
          activeMedia.parentElement.firstChild !== activeMedia &&
            activeMedia.parentElement.prepend(activeMedia);

          if (this.elements.thumbnails) {
            const activeThumbnail = this.elements.thumbnails.querySelector(
              `[data-target="${mediaId}"]`
            );
            activeThumbnail.parentElement.firstChild !== activeThumbnail &&
              activeThumbnail.parentElement.prepend(activeThumbnail);
          }

          if (this.elements.viewer.slider) this.elements.viewer.resetPages();
        }

        this.preventStickyHeader();
        window.setTimeout(() => {
          if (!this.mql.matches || this.elements.thumbnails) {
            activeMedia.parentElement.scrollTo({
              left: activeMedia.offsetLeft,
            });
          }
          const activeMediaRect = activeMedia.getBoundingClientRect();
          // Don't scroll if the image is already in view
          if (activeMediaRect.top > -0.5) return;
          const top = activeMediaRect.top + window.scrollY;
          window.scrollTo({ top: top, behavior: "smooth" });
        });
        this.playActiveMedia(activeMedia);

        if (!this.elements.thumbnails) return;
        const activeThumbnail = this.elements.thumbnails.querySelector(
          `[data-target="${mediaId}"]`
        );
        this.setActiveThumbnail(activeThumbnail);
        this.announceLiveRegion(
          activeMedia,
          activeThumbnail.dataset.mediaPosition
        );

        this.renderVariantSection(id);
      }

      async renderVariantSection(variantId) {
        const productInfo = this.closest("product-info");
        if (!productInfo) return;

        const sectionId = productInfo.dataset.section;
        const productUrl = window.location.pathname;

        try {
          const response = await fetch(
            `${productUrl}?variant=${variantId}&section_id=${sectionId}`
          );
       
          if (!response.ok) throw new Error(response.statusText);

          const html = await response.text();
          const parser = new DOMParser();
          const newDocument = parser.parseFromString(html, "text/html");

          this.updatePriceElement(newDocument, sectionId);
          this.updateVariantInfo(newDocument, sectionId);
          this.updateInventoryStatus(newDocument, sectionId);

          this.dispatchVariantChangeEvent(newDocument, sectionId, variantId);

        const variantSelect = document.querySelector('[data-variant-select]');

            if (variantSelect) {
                variantSelect.value = variantId;

                const changeEvent = new Event('change', { bubbles: true });
                variantSelect.dispatchEvent(changeEvent);
            }

          if (history.replaceState) {
            const url = new URL(window.location.href);
            url.searchParams.set('variant', variantId);
            window.history.replaceState({ path: url.href }, '', url.href);
          } 

        } catch (error) {
          console.error("Error updating variant:", error);
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

      updatePriceElement(newDocument, sectionId) {
        this.updateElement("price", newDocument, sectionId);
        this.updateElement("compare-price", newDocument, sectionId);
        this.updateElement("unit-price", newDocument, sectionId);
      }

      updateVariantInfo(newDocument, sectionId) {
        this.updateElement("Sku", newDocument, sectionId);
        this.updateElement("variant-title", newDocument, sectionId);
        this.updateElement("variant-barcode", newDocument, sectionId);
      }

      updateInventoryStatus(newDocument, sectionId) {
        this.updateElement("Inventory", newDocument, sectionId);
        this.updateElement("available", newDocument, sectionId);
      }

      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail) return;

        this.elements.thumbnails
          .querySelectorAll("button")
          .forEach((element) => element.removeAttribute("aria-current"));
        thumbnail.querySelector("button").setAttribute("aria-current", true);
        if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

        this.elements.thumbnails.slider.scrollTo({
          left: thumbnail.offsetLeft,
        });
      }

      announceLiveRegion(activeItem, position) {
        const image = activeItem.querySelector(
          ".product__modal-opener--image img"
        );
        if (!image) return;
        image.onload = () => {
          this.elements.liveRegion.setAttribute("aria-hidden", false);
          this.elements.liveRegion.innerHTML =
            window.accessibilityStrings.imageAvailable.replace(
              "[index]",
              position
            );
          setTimeout(() => {
            this.elements.liveRegion.setAttribute("aria-hidden", true);
          }, 2000);
        };
        image.src = image.src;
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector(".deferred-media");
        if (deferredMedia) deferredMedia.loadContent(false);
      }

      preventStickyHeader() {
        this.stickyHeader =
          this.stickyHeader || document.querySelector("sticky-header");
        if (!this.stickyHeader) return;
        this.stickyHeader.dispatchEvent(new Event("preventHeaderReveal"));
      }

      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute("role", "presentation");
        this.elements.viewer.sliderItems.forEach((slide) =>
          slide.setAttribute("role", "presentation")
        );
      }
    }
  );
}
