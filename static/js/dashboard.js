document.addEventListener("DOMContentLoaded", () => {
    let row = document.querySelectorAll(".programs");

    row.forEach(row => {
        let section = row.querySelector("select");
        let button = row.querySelector("a")

        section.addEventListener("change", ()=>{
            button.href = button.href.substring(0, button.href.length-1) + (section.value.charCodeAt(0) - 65);
        });
    });
});