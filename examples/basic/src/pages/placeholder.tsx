export default function PlaceholderPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">
        {"{"}JSON{"}"} Placeholder
      </h1>
      <p className="text-muted-foreground">
        Free fake API powered by <strong>@thexjs/core</strong> — in-memory data, sub-ms response
        times.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-medium">Endpoint</th>
              <th className="text-right p-3 font-medium">Size</th>
              <th className="text-right p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody id="endpoints">
            <tr className="border-b border-border">
              <td className="p-3">
                <code className="bg-muted px-1.5 py-0.5 rounded">GET /api/placeholder/posts</code>
              </td>
              <td className="text-right p-3">100</td>
              <td className="text-right p-3">
                <button
                  type="button"
                  className="fetch-btn text-primary hover:underline text-xs"
                  data-url="/api/placeholder/posts"
                >
                  Fetch
                </button>
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="p-3">
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  GET /api/placeholder/comments
                </code>
              </td>
              <td className="text-right p-3">500</td>
              <td className="text-right p-3">
                <button
                  type="button"
                  className="fetch-btn text-primary hover:underline text-xs"
                  data-url="/api/placeholder/comments"
                >
                  Fetch
                </button>
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="p-3">
                <code className="bg-muted px-1.5 py-0.5 rounded">GET /api/placeholder/todos</code>
              </td>
              <td className="text-right p-3">200</td>
              <td className="text-right p-3">
                <button
                  type="button"
                  className="fetch-btn text-primary hover:underline text-xs"
                  data-url="/api/placeholder/todos"
                >
                  Fetch
                </button>
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="p-3">
                <code className="bg-muted px-1.5 py-0.5 rounded">GET /api/placeholder/users</code>
              </td>
              <td className="text-right p-3">10</td>
              <td className="text-right p-3">
                <button
                  type="button"
                  className="fetch-btn text-primary hover:underline text-xs"
                  data-url="/api/placeholder/users"
                >
                  Fetch
                </button>
              </td>
            </tr>
            <tr className="font-semibold">
              <td colSpan={2} className="p-3">
                All endpoints (sequential)
              </td>
              <td className="text-right p-3">
                <button
                  type="button" id="fetch-all" className="fetch-btn text-primary hover:underline text-xs">
                  Fetch All
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        id="results"
        className="rounded-lg border border-border bg-muted p-4 font-mono text-xs whitespace-pre-wrap min-h-[60px]"
      >
        Click a button to fetch data. Response times shown below.
      </div>

      <hr className="border-border" />
      <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        &larr; Back home
      </a>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function () {
  var results = document.getElementById("results");
  if (!results) return;
  function log(msg) { results.textContent = msg; }

  function fmt(ms) {
    if (ms < 1) return (ms * 1000).toFixed(0) + " \\u00b5s";
    if (ms < 10) return ms.toFixed(2) + " ms";
    return ms.toFixed(1) + " ms";
  }

  [].forEach.call(document.querySelectorAll(".fetch-btn:not(#fetch-all)"), function (btn) {
    btn.addEventListener("click", function () {
      var url = btn.getAttribute("data-url");
      btn.disabled = true;
      btn.textContent = "Loading...";
      log("Fetching " + url + "\\n");
      var start = performance.now();
      fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (json) {
          var elapsed = performance.now() - start;
          var size = JSON.stringify(json).length;
          var label = btn.parentElement.previousElementSibling.textContent.trim();
          log(
            "\\u2714 " + url + "\\n" +
            "Status: 200 OK\\n" +
            "Time:   " + fmt(elapsed) + "\\n" +
            "Size:   " + (size / 1024).toFixed(1) + " KB\\n" +
            "Items:  " + (Array.isArray(json) ? json.length : json.data ? json.data.length : 1) + "\\n\\n" +
            JSON.stringify(json, null, 2).slice(0, 2000) +
            (JSON.stringify(json, null, 2).length > 2000 ? "\\n..." : "")
          );
        })
        .catch(function (err) {
          log("\\u2716 Error: " + err.message);
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "Fetch";
        });
    });
  });

  var fetchAll = document.getElementById("fetch-all");
  if (fetchAll) {
    fetchAll.addEventListener("click", function () {
      fetchAll.disabled = true;
      fetchAll.textContent = "Running...";
      var urls = ["/api/placeholder/posts", "/api/placeholder/comments", "/api/placeholder/todos", "/api/placeholder/users"];
      var lines = ["Benchmarking " + urls.length + " endpoints...\\n"];
      var totalStart = performance.now();

      function run(i) {
        if (i >= urls.length) {
          var total = performance.now() - totalStart;
          lines.push("\\u2014".repeat(30));
          lines.push("Total: " + fmt(total) + " (" + fmt(total / urls.length) + " avg)");
          log(lines.join("\\n"));
          fetchAll.disabled = false;
          fetchAll.textContent = "Fetch All";
          return;
        }
        var url = urls[i];
        var start = performance.now();
        fetch(url)
          .then(function (r) { return r.json(); })
          .then(function () {
            var elapsed = performance.now() - start;
            lines.push((i + 1) + ". " + url + " \\u2192 " + fmt(elapsed));
            run(i + 1);
          })
          .catch(function (err) {
            lines.push((i + 1) + ". " + url + " \\u2716 " + err.message);
            run(i + 1);
          });
      }
      run(0);
    });
  }
})();
          `.trim(),
        }}
      />
    </div>
  );
}
