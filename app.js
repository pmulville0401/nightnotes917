/*
 * Night Notes Tracker
 * GitHub Pages + Supabase
 *
 * IMPORTANT:
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with the values
 * from your Supabase project's Connect/API settings.
 */

const SUPABASE_URL = "https://gcipoilpiasmwqqfobhv.supabase.co";


const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
);

let items = [];

const $ = (id) => document.getElementById(id);

function setStatus(message, type = "") {
  const status = $("status");
  status.textContent = message;
  status.className = `status ${type}`.trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadItems() {
  setStatus("Loading items...");

  const { data, error } = await supabaseClient
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    setStatus(`Database error: ${error.message}`, "error");
    return;
  }

  items = data || [];
  render();
  setStatus("Connected", "success");
}

async function addItem() {
  const project = $("project").value.trim();
  const title = $("title").value.trim();

  if (!project || !title) {
    alert("Project Name and Item Title are required");
    return;
  }

  const button = $("createButton");
  button.disabled = true;
  button.textContent = "Creating...";

  const newItem = {
    project,
    title,
    assigned: $("assigned").value.trim(),
    priority: $("priority").value,
    due: $("due").value || null,
    desc: $("desc").value.trim(),
    completed: false
  };

  const { error } = await supabaseClient
    .from("items")
    .insert(newItem);

  button.disabled = false;
  button.textContent = "Create Item";

  if (error) {
    console.error(error);
    alert(`Could not create item: ${error.message}`);
    return;
  }

  $("project").value = "";
  $("title").value = "";
  $("assigned").value = "";
  $("due").value = "";
  $("desc").value = "";

  await loadItems();
}

async function completeItem(id) {
  const { error } = await supabaseClient
    .from("items")
    .update({
      completed: true,
      completed_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert(`Could not complete item: ${error.message}`);
    return;
  }

  await loadItems();
}

function formatDate(value) {
  if (!value) return "-";

  // Date-only values should not be shifted by timezone conversion.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${month}/${day}/${year}`;
  }

  return new Date(value).toLocaleString();
}

function card(item) {
  const closed = Boolean(item.completed);

  return `
    <div class="card ${closed ? "closed-card" : "open-card"}">
      <h3>${escapeHtml(item.title)}</h3>
      <p><b>Project:</b> ${escapeHtml(item.project)}</p>
      <p>${escapeHtml(item.desc || "")}</p>
      <p><b>Assigned:</b> ${escapeHtml(item.assigned || "-")}</p>
      <p><b>Priority:</b> ${escapeHtml(item.priority)}</p>
      <p><b>Due:</b> ${escapeHtml(formatDate(item.due))}</p>
      <p><b>Created:</b> ${escapeHtml(formatDate(item.created_at))}</p>

      ${
        closed
          ? `<p class="done"><b>Completed:</b> ${escapeHtml(formatDate(item.completed_at))}</p>`
          : `<button type="button" class="complete-button" data-id="${escapeHtml(item.id)}">Mark Complete</button>`
      }
    </div>
  `;
}

function render() {
  const filter = $("projectFilter");
  const current = filter.value || "All Projects";

  const projects = [...new Set(items.map(item => item.project))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  filter.innerHTML =
    '<option value="All Projects">All Projects</option>' +
    projects
      .map(project => `<option value="${escapeHtml(project)}">${escapeHtml(project)}</option>`)
      .join("");

  filter.value =
    projects.includes(current) || current === "All Projects"
      ? current
      : "All Projects";

  const filtered =
    filter.value === "All Projects"
      ? items
      : items.filter(item => item.project === filter.value);

  const open = filtered.filter(item => !item.completed);
  const closed = filtered.filter(item => item.completed);

  $("openCount").textContent = `Open: ${open.length}`;
  $("completeCount").textContent = `Completed: ${closed.length}`;

  $("openItems").innerHTML = open.length
    ? open.map(card).join("")
    : '<div class="card">No Open Items</div>';

  $("closedItems").innerHTML = closed.length
    ? closed.map(card).join("")
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
      formatDate(item.created_at),
      item.completed ? "Completed" : "Open",
      item.completed_at ? formatDate(item.completed_at) : ""
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

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "NightNotesExport.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function subscribeToChanges() {
  supabaseClient
    .channel("items-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "items" },
      () => loadItems()
    )
    .subscribe();
}

$("createButton").addEventListener("click", addItem);

$("projectFilter").addEventListener("change", render);

$("printButton").addEventListener("click", () => window.print());

$("exportButton").addEventListener("click", exportExcel);

$("refreshButton").addEventListener("click", loadItems);

$("openItems").addEventListener("click", event => {
  const button = event.target.closest(".complete-button");
  if (!button) return;

  completeItem(button.dataset.id);
});

document.addEventListener("DOMContentLoaded", async () => {
  if (
    SUPABASE_URL === "YOUR_SUPABASE_PROJECT_URL" ||
    SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY"
  ) {
    setStatus("Add your Supabase URL and anon key in app.js", "error");
    return;
  }

  await loadItems();
  subscribeToChanges();
});
