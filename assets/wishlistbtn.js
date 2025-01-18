document.addEventListener('DOMContentLoaded', () => {
  var wishlistButton = document.querySelectorAll('.onstwishlist-btn');

  var appurl = 'https://wishlist.onlinestatusindicator.com';

  if (wishlistButton.length > 0) {
    var checkDataIds = [];

    var wishlistId = '';
    var wishlistShop = '';

    var customerEmail = '';

    wishlistButton.forEach((wishlistButtonAc) => {
      var checkCustomerAdd = wishlistButtonAc.getAttribute('data-login');

      if (checkCustomerAdd == 'wishlist') {
        var wishlistButtonBox = wishlistButtonAc.closest('.onstwishlistbtnbox');
        var surecustwishlistids = wishlistButtonBox.querySelectorAll(
          'input[name="surecustwishlistid"]'
        );
        if (surecustwishlistids.length > 0) {
          surecustwishlistids.forEach((surecustwishlistidsV) => {
            if (surecustwishlistidsV.value !== '') {
              wishlistId = surecustwishlistidsV.value;
            }
          });
        }
        var surecustwishlistshops = wishlistButtonBox.querySelectorAll(
          'input[name="surecustwishlistshop"]'
        );
        if (surecustwishlistshops.length > 0) {
          surecustwishlistshops.forEach((surecustwishlistshopsV) => {
            if (surecustwishlistshopsV.value !== '') {
              wishlistShop = surecustwishlistshopsV.value;
            }
          });
        }

        if (wishlistButtonAc.getAttribute('data-customer') !== '') {
          customerEmail = wishlistButtonAc.getAttribute('data-customer');
        }

        var productId = wishlistButtonAc.getAttribute('data-id');

        checkDataIds.push(productId);
      }

      wishlistButtonAc.addEventListener('click', function (selector) {
        var target = selector.target;
        if (target.classList.contains('onstwishlist-btn')) {
        } else {
          target = target.closest('.onstwishlist-btn');
        }
        var checkCustomer = target.getAttribute('data-login');
        if (checkCustomer == 'customer') {
          location.href = '/account';
        }
        if (checkCustomer == 'wishlist') {
          var customer = customerEmail;
          if (target.getAttribute('data-customer') !== '') {
            customer = target.getAttribute('data-customer');
          }
          var product = target.getAttribute('data-id');
          var parentBox = target.closest('.onstwishlistbtnbox');
          var surecustwishlistid = wishlistId;
          var surecustwishlistshop = wishlistShop;
          var surecustwishlistids = parentBox.querySelectorAll(
            'input[name="surecustwishlistid"]'
          );
          if (surecustwishlistids.length > 0) {
            surecustwishlistids.forEach((surecustwishlistidsV) => {
              if (surecustwishlistidsV.value !== '') {
                surecustwishlistid = surecustwishlistidsV.value;
              }
            });
          }
          var surecustwishlistshops = parentBox.querySelectorAll(
            'input[name="surecustwishlistshop"]'
          );
          if (surecustwishlistshops.length > 0) {
            surecustwishlistshops.forEach((surecustwishlistshopsV) => {
              if (surecustwishlistshopsV.value !== '') {
                surecustwishlistshop = surecustwishlistshopsV.value;
              }
            });
          }
          var wishlistadd = 1;
          if (customer == '' || product == '') {
            wishlistadd = 0;
          }
          if (target.classList.contains('onstloading')) {
          } else {
            if (wishlistadd == 1) {
              var postData = {
                customer: customer,
                product: product,
                wishlist: surecustwishlistid,
                shop: surecustwishlistshop,
              };

              target.classList.add('onstloading');

              fetch(appurl + '/api/wishlistregister', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json', // Set the content type to JSON
                },
                body: JSON.stringify(postData), // Convert the data to JSON format
              })
                .then((response) => {
                  // Check if the request was successful
                  if (!response.ok) {
                    throw new Error('Network response was not ok');
                  }
                  // Parse the response as JSON and return it
                  return response.json();
                })
                .then((data) => {
                  // Handle the data from the response
                  if (data.allow) {
                    target.setAttribute('data-login', 'already');
                  } else {
                    //location.reload();
                  }
                  target.classList.remove('onstloading');
                })
                .catch((error) => {
                  // Handle errors
                  alert('Something went wrong, Please try after reload');
                  location.reload();
                });
            }
          }
        }
      });
    });

    if (wishlistId !== '' && wishlistShop !== '' && customerEmail !== '') {
      if (checkDataIds.length > 0) {
        var postCheck = {
          wishlistId: wishlistId,
          wishlistShop: wishlistShop,
          checkDataIds: checkDataIds,
          customerEmail: customerEmail,
        };

        fetch(appurl + '/api/wishlistchecker', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
          },
          body: JSON.stringify(postCheck), // Convert the data to JSON format
        })
          .then((response) => {
            // Check if the request was successful
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            // Parse the response as JSON and return it
            return response.json();
          })
          .then((data) => {
            // Handle the data from the response
            if (data.allow) {
              if (data.data) {
                var addedIds = data.data;
                if (addedIds.length > 0) {
                  addedIds.forEach((addedId) => {
                    wishlistButton.forEach((wishlistButtonAc) => {
                      if (wishlistButtonAc.getAttribute('data-id') == addedId) {
                        wishlistButtonAc.setAttribute('data-login', 'already');
                      }
                    });
                  });
                }
              }
            } else {
              //location.reload();
              console.log('Not Allowed');
            }
            wishlistButton.forEach((wishlistButtonAc) => {
              wishlistButtonAc.classList.remove('onstloading');
            });
          })
          .catch((error) => {
            console.log(error);
            // Handle errors
            //alert("Something went wrong, Please try after reload");
            //location.reload();
          });
      }
    }
  }
});
