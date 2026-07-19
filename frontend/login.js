let click = document.querySelector("#submit");
let userName;
let password;
click.addEventListener("click",async ()=>{
    const element = document.getElementById("user_name");
    const element2 = document.getElementById("password");
    userName = element.value;
    password = element2.value;

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userName: userName,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = "/convo";
        } else {
            alert("Invalid login credentials");
        }

    } catch (err) {
        console.error(err);
    }
});

const showPasswordCheckbox = document.getElementById("showPassword");
const passwordInput = document.getElementById("password");

showPasswordCheckbox.addEventListener("change", function () {
    if (this.checked) {
        passwordInput.type = "text";   // Show password
    } else {
        passwordInput.type = "password"; // Hide password
    }
});