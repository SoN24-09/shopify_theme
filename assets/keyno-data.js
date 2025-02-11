document.addEventListener('DOMContentLoaded', function () {
    const keyNoInput = document.getElementById('keyNoInput');
    const hideByButton = document.getElementById('buyButtonContainer');
    if (!keyNoInput) {
        return;
    }
    // keyNoInput.addEventListener('change', function () {
    //     const inputValue = this.value.trim();

    //     if (inputValue.length == 8 || inputValue.length == 10) {
    //         hideByButton.classList.remove('buy-button--hidden');
    //     } else {
    //         hideByButton.classList.add('buy-button--hidden');
    //     }
    // });

    // keyNoInput.addEventListener('input', function () {
    //     const inputValue = this.value.trim();

    //     if (inputValue.length == 8 || inputValue.length == 10) {
    //         hideByButton.classList.remove('buy-button--hidden');
    //     } else {
    //         hideByButton.classList.add('buy-button--hidden');
    //     }
    // });

   keyNoInput.addEventListener('input', function () {
        const inputValue = this.value.trim();
        var match = inputValue.match(/^[0-9]+$/);
        if (match) {
            if (inputValue.length == 8 || inputValue.length == 10) {
                hideByButton.classList.remove('buy-button--hidden');
            } else {
                hideByButton.classList.add('buy-button--hidden');
            }
            document.getElementById('keyNoInputWarning').style.display = 'none';
        } else {
            hideByButton.classList.add('buy-button--hidden');
            // show warning message
            document.getElementById('keyNoInputWarning').style.display = 'block';
        }

        if (inputValue.length == 0) {
            document.getElementById('keyNoInputWarning').style.display = 'none';
            hideByButton.classList.add('buy-button--hidden');
        }
    });

    document.getElementById('keyNoInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });
});
