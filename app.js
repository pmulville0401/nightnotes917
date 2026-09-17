let items = JSON.parse(localStorage.getItem("items")) || [];

function save() {
    localStorage.setItem("items", JSON.stringify(items));
    render();
}

function addItem() {
    const p = document.getElementById("project").value.trim();
    const t = document.getElementById("title").value.trim();
    const assigned = document.getElementById("assigned");
    const priority = document.getElementById("priority");
    const due = document.getElementById("due");
    const desc = document.getElementById("desc");

    if (!p || !t) {
        alert("Project Name and Item Title are required");
        return;
    }

    items.unshift({
        id: Date.now(),
        project: p,
        title: t,
        assigned: assigned.value,
        priority: priority.value,
        due: due.value,
        desc: desc.value,
        createdAt: new Date().toLocaleString(),
        completed: false,
        completedAt: null
    });

    document.getElementById("project").value = "";
    document.getElementById("title").value = "";
    assigned.value = "";
    desc.value = "";
    due.value = "";

    save();
}

function completeItem(id) {
    const item = items.find(x => x.id === id);

    if (item) {
        item.completed = true;
        item.completedAt = new Date().toLocaleString();
        save();
    }
}

function card(item, closed) {
    return `
        <div class="card ${closed ? "closed-card" : "open-card"}">
            <h3>${item.title}</h3>
            <p><b>Project:</b> ${item.project}</p>
            <p>${item.desc || ""}</p>
            <p><b>Assigned:</b> ${item.assigned || "-"}</p>
            <p><b>Priority:</b> ${item.priority}</p>
            <p><b>Due:</b> ${item.due || "-"}</p>
            <p><b>Created:</b> ${item.createdAt}</p>

            ${
                item.completed
                    ? `<p class="done"><b>Completed:</b> ${item.completedAt}</p>`
                    : `<button onclick="completeItem(${item.id})">Mark Complete</button>`
            }
        </div>
    `;
}

function render() {
    const filter = document.getElementById("projectFilter");
    const cur = filter.value || "All Projects";

    const projects = [...new Set(items.map(item => item.project))];

    filter.innerHTML =
        '<option>All Projects</option>' +
        projects
            .map(project => `<option>${project}</option>`)
            .join("");

    filter.value =
        projects.includes(cur) || cur === "All Projects"
            ? cur
            : "All Projects";

    const filtered =
        filter.value === "All Projects"
            ? items
            : items.filter(item => item.project === filter.value);

    const open = filtered.filter(item => !item.completed);
    const closed = filtered.filter(item => item.completed);

    document.getElementById("openCount").textContent =
        "Open: " + open.length;

    document.getElementById("completeCount").textContent =
        "Completed: " + closed.length;

    document.getElementById("openItems").innerHTML =
        open.length
            ? open.map(item => card(item, false)).join("")
            : '<div class="card">No Open Items</div>';

    document.getElementById("closedItems").innerHTML =
        closed.length
            ? closed.map(item => card(item, true)).join("")
            : '<div class="card">No Completed Items</div>';
}

function exportExcel() {
    const rows = [
        [
            "Project",
            "Title",
            "Description",
            "Assigned To",
            "Priority",
            "Due Date",
            "Created",
            "Status",
            "Completed"
        ]
    ];

    items.forEach(item => {
        rows.push([
            item.project,
            item.title,
            item.desc || "",
            item.assigned || "",
            item.priority,
            item.due || "",
            item.createdAt,
            item.completed ? "Completed" : "Open",
            item.completedAt || ""
        ]);
    });

    const csv = rows
        .map(row =>
            row
                .map(value => `"${String(value).replace(/"/g, '""')}"`)
                .join(",")
        )
        .join("\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "NightNotesExport.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);
}

document.addEventListener("DOMContentLoaded", render);