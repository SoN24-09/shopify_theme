document.addEventListener('DOMContentLoaded', function() {     
    const nameInput = document.getElementById('nameInput');     
    const checkButton = document.getElementById('checkButton');        
   
    nameInput.addEventListener('input', function() {         
        const inputValue = this.value.trim();              

        if(inputValue.length >= 8 && inputValue.length <= 10) {             
            checkButton.classList.add('show');        
        } else {             
            checkButton.classList.remove('show');      
        }     
    });        
  
    checkButton.addEventListener('click', function() {         
        const keyno = nameInput.value.trim();              

        fetch('http://localhost:3001/api/get-keyno', {             
            method: 'GET'         
        })         
        .then(response => response.json())         
        .then(data => {             
            if (data.image) {                 
                const productImage = document.querySelector('.product__media.media.media--transparent > img');                 
                if (productImage) {                     
                    productImage.setAttribute('srcset', data.image);                 
                }                  
              
                const imageInput = document.getElementById('image');                 
                if (imageInput) {                     
                    imageInput.value = data.image;                 
                }             
            }         
        })         
        .catch(error => {             
            console.error('Error:', error);         
        });     
    }); 
});
