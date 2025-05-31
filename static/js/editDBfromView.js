const cancel_page_btn = '<button type="button" class="btn btn-secondary me-2" id="cancel-data">Cancel</button>';
const save_page_btn = '<button type="button" class="btn btn-primary ms-2" id="save-data">Save Data</button>';
const edit_page_btn = '<button type="button" class="btn btn-primary" id="edit-data">Edit Data</button>';
const add_row_btn = `<div class="row"><div class="col-sm-3 col-auto mx-auto material-symbols-outlined p-3 align-middle btn btn-outline-secondary bg-body-secondary" style="font-size: 1.3rem;">add</div></div>`;
const commit_controls = cancel_page_btn + save_page_btn

document.addEventListener("DOMContentLoaded", () => {
    toggle_edit_mode();
});

function toggle_edit_mode() {
    const form_actions = document.getElementById("form-action");
    const form_data = document.getElementById("info-form");
    const form_fileds = form_data.querySelectorAll(".data-field");
    const table = document.getElementById("info-table");
    const form_role = form_data.dataset.role_id;

    document.getElementById("edit-data").addEventListener("click", async () => {
        if (form_role === "teacher"){
            const codes_responce = await fetch("/query?q=teachers");
            const program_codes = await codes_responce.json();
        }
        
        form_actions.innerHTML = commit_controls;
        
        form_fileds.forEach(field => {
            if (field.tagName === "TR"){
                field.insertAdjacentHTML("beforeend", make_editfield_button(field.id));    
            }
            else{
                field.insertAdjacentHTML("afterend", make_editfield_button(field.id));
            }
        });

        table.innerHTML += add_row_btn;

        const edit_field_btn = document.querySelectorAll("[data-buttonfor]")
        edit_field_btn.forEach(e=>{
            e.addEventListener("click", async ()=>{
                const edit_element = document.getElementById(e.dataset.buttonfor);
                if (edit_element.dataset.type === "text"){
                    edit_element.innerHTML = `<input class="form-control" type="text" placeholder="Full Name" value="${edit_element.innerHTML}">`;
                }
                else if (edit_element.dataset.type === "dropdown"){
                    if (edit_element.id === "sex"){
                        const sex = edit_element.innerHTML;
                        edit_element.innerHTML = `<select class="form-select">
                                                    <option value="0">Female</option>
                                                    <option value="1">Male</option>
                                                </select>`;
                        edit_element.querySelector("select").value = sex === "Male" ? "1" : "0";
                    }
                    else if (form_role === "teacher"){
                        const program_code = edit_element.querySelector("#program_code");
                        const program_name = edit_element.querySelector("#program_name");
                        const course_name = edit_element.querySelector("#course_name");

                        
                        
                        let dropdown = ''

                        console.log("CLICKED")

                        console.log(program_codes);
                    }
                }
            });
        });
    });
}

function commit_data() {

}

function make_editfield_button(button_for) {
    return `<td><div class="col-auto material-symbols-outlined ms-4 p-1 align-middle btn btn-outline-secondary" 
    data-buttonfor="${button_for}" style="font-size: 1.3rem;">edit</div></td>`;
}