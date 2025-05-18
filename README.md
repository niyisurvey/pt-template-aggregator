# 🚀 Portainer Template Aggregator Cloudflare Worker

A Cloudflare Worker that aggregates multiple Portainer V2 application template files into a single, de-duplicated, and sorted JSON feed for your Portainer instance.

## ✨ Features

* **Aggregates Multiple Sources**: Combines templates from various JSON feeds.
* **De-duplicates**: Removes duplicate templates based on title (case-insensitive).
* **Sorts**: Sorts the final list of templates alphabetically by title.
* **Dynamic User Sources**: Allows adding custom template sources via a URL query parameter.
* **Self-Hosted & Free**: Runs on a free Cloudflare Workers plan.
* **Enhanced Error Handling & Logging**: Improved resilience when fetching and parsing template sources.

## 🤔 Why This Project?

This project was created because the original GitLab snippet by Ibaraki (and similar solutions) faced some issues with newer Portainer versions and some template sources became outdated or returned errors. This worker aims to:

1.  Provide a more robust solution for aggregating Portainer templates.
2.  Use an updated list of default template sources.
3.  Implement more resilient fetching and parsing logic.
4.  Offer clearer logging and diagnostics via Cloudflare Worker logs and response headers.

I needed a reliable way to manage a large and diverse set of Portainer templates for my self-hosting setup.

## 🛠️ How It Works

The Cloudflare Worker fetches template definitions from:
1.  A predefined list of default URLs in `src/index.js`.
2.  Any URLs provided in a `?templates=` query parameter (Base64 encoded JSON array of URLs).
3.  (Optionally) Template objects hardcoded directly into `src/index.js`.

It then:
1.  Parses each source.
2.  Extracts individual template objects.
3.  Filters out malformed or incomplete templates.
4.  Merges all valid templates into a single list.
5.  Removes duplicates by title (case-insensitive).
6.  Sorts the list alphabetically by title.
7.  Returns a Portainer V2 compatible JSON response.

## 🚀 Deployment & Usage

### Prerequisites
* A Cloudflare account.
* `wrangler` CLI installed (`npm install -g wrangler`).

### Deployment
1.  Clone this repository:
    ```bash
    git clone [https://github.com/niyisurvey/pt-template-aggregator.git](https://github.com/niyisurvey/pt-template-aggregator.git) 
    # Replace with your actual repository URL if different
    cd pt-template-aggregator 
    # Or your actual project folder name, e.g., fresh-portainer-worker-cf
    ```
2.  Log in to Cloudflare (if needed):
    ```bash
    wrangler login
    ```
3.  Deploy the worker:
    ```bash
    wrangler deploy
    ```
    This will output your worker URL (e.g., `https://fresh-portainer-worker-cf.your-account.workers.dev`). Note this URL.

### Portainer Configuration
1.  In Portainer, navigate to **Settings** > **App Templates**.
2.  Paste your deployed worker URL into the "URL" field.
3.  Click **Save application settings**.

## ➕ How to Add Your Own Custom Template Lists

There are a few ways to add your own custom Portainer templates or lists of templates to this worker:

**1. For the Worker Owner: Modifying the Worker Code (`src/index.js`)**

This method is best if you are hosting the worker yourself and want to permanently include specific templates or template lists. After making changes to `src/index.js`, you must re-deploy the worker using `wrangler deploy`.

   * **A. Adding URLs to External Template Files:**
      * Open the `src/index.js` file in your project.
      * Locate the `defaultTemplateProviderURLs` array.
      * Add the direct URLs to your JSON template files to this array. For example:
          ```javascript
          const defaultTemplateProviderURLs = [
            "[https://raw.githubusercontent.com/portainer/templates/master/templates.json](https://raw.githubusercontent.com/portainer/templates/master/templates.json)",
            // ... other default URLs ...
            "[https://your-url.com/path/to/your-custom-templates.json](https://your-url.com/path/to/your-custom-templates.json)", // Add your URL here
            "[https://gist.githubusercontent.com/yourusername/yourgistid/raw/your-templates.json](https://gist.githubusercontent.com/yourusername/yourgistid/raw/your-templates.json)" // Example Gist URL
          ];
          ```

   * **B. Adding Individual Template Objects Directly (for a few custom templates):**
      * If you have only a few simple templates and don't want to host a separate JSON file, you can add them directly into the `src/index.js` script.
      * Find the line `let aggregatedTemplates = [];` (near the beginning of the `Workspace` function).
      * You can `push` template objects directly into this array. Example:
          ```javascript
          let aggregatedTemplates = [];
          aggregatedTemplates.push({
              "type": 1, // 1 for container, 2 for Swarm stack, 3 for Compose stack
              "title": "My Custom App (Built-in)",
              "name": "my-custom-app-stack", // For stacks, this is the stack name
              "description": "A brief description of my awesome custom application.",
              "categories": ["Custom", "Utility"],
              "platform": "linux", // or "windows"
              "logo": "[https://example.com/path/to/your/logo.png](https://example.com/path/to/your/logo.png)", // Optional but recommended
              "image": "yourdockerimage/yourcustomapp:latest", // For type 1 (container)
              // For type 2 or 3 (stacks), you'd use 'repository' instead of 'image':
              // "repository": {
              //   "url": "[https://github.com/yourusername/your-app-stack-repo](https://github.com/yourusername/your-app-stack-repo)",
              //   "stackfile": "docker-compose.yml" // or portainer-stack.yml etc.
              // },
              "env": [ // Optional environment variables
                { "name": "MY_VARIABLE", "label": "My Custom Variable", "default": "default_value" }
              ],
              "ports": ["8080:80/tcp"], // Optional port mappings
              "note": "Some notes about this custom template." // Optional notes (can be HTML)
          });
          ```
      * Ensure your template object follows the Portainer V2 template schema. You can find more details by looking at the structure of [Portainer's official template file](https://raw.githubusercontent.com/portainer/templates/master/templates.json).

**2. For Any User (including the Worker Owner): Using the URL Parameter**

This method allows you or anyone using your deployed worker URL to dynamically add template lists without modifying the worker's code.

   * **A. Create Your Template JSON File:**
      * Your JSON file must be an array of Portainer V2 template objects, OR an object containing a `"templates"` key with such an array (like Portainer's official file).
      * **Example `my-templates.json` structure (an array of templates):**
          ```json
          [
            {
              "type": 1,
              "title": "My App 1 via URL Param",
              "name": "myapp1-url",
              "description": "Description for My App 1.",
              "image": "nginx:latest",
              "logo": "[https://raw.githubusercontent.com/portainer/templates/master/logos/nginx.png](https://raw.githubusercontent.com/portainer/templates/master/logos/nginx.png)",
              "ports": ["8001:80/tcp"]
            },
            {
              "type": 1,
              "title": "My App 2 via URL Param",
              "name": "myapp2-url",
              "description": "Description for My App 2.",
              "image": "httpd:latest",
              "logo": "[https://raw.githubusercontent.com/portainer/templates/master/logos/httpd.png](https://raw.githubusercontent.com/portainer/templates/master/logos/httpd.png)",
              "ports": ["8002:80/tcp"]
            }
          ]
          ```

   * **B. Host Your JSON File Publicly:**
      * Upload your `my-templates.json` file to a place where it's accessible via a direct public URL. Good free options include:
          * **GitHub Gist:** Create a public Gist, name the file (e.g., `my_templates.json`), paste your JSON content, save it, and then click the "Raw" button to get the direct URL.
          * **GitHub Repository:** Add the JSON file to a public GitHub repository and use the "Raw" file URL (navigate to the file, click "Raw").

   * **C. Prepare the URL for Portainer:**
      1.  Create a JSON array string containing the raw URL(s) pointing to your template file(s):
          `["https://your-raw-url.com/path/to/my-templates.json"]`
          (You can include multiple URLs in this array, separated by commas).
      2.  Convert this entire JSON array string to **Base64**. You can use an online tool (search for "json to base64 encoder") or a script.
          *Example: If your JSON array string is `["https://example.com/templates.json"]`*, the Base64 might be *`WyJodHRwczovL2V4YW1wbGUuY29tL3RlbXBsYXRlcy5qc29uIl0=`*.
      3.  Take your deployed worker URL (e.g., `https://fresh-portainer-worker-cf.niyi-666.workers.dev`) and append the `templates` query parameter with your Base64 string:
          `https://fresh-portainer-worker-cf.niyi-666.workers.dev/?templates=YOUR_BASE64_ENCODED_STRING_HERE`
      4.  Use this complete URL in Portainer's App Templates settings.

## 📜 Default Template Sources Used by This Worker

This worker currently includes the following default sources in `src/index.js` (you can curate this list):
* `https://raw.githubusercontent.com/portainer/templates/master/templates.json` (Official Portainer)
* `https://raw.githubusercontent.com/Lissy93/portainer-templates/main/templates.json`
* `https://raw.githubusercontent.com/Qballjos/portainer_templates/master/Template/template.json`
* `https://raw.githubusercontent.com/SelfhostedPro/selfhosted_templates/portainer-2.0/Template/template.json`
    *(Please verify these URLs are still active and suitable for your needs before relying on them.)*

## 🙏 Credits & Acknowledgements

* This project is an evolution of the concept originally shared by **Ibaraki** on GitLab: `https://git.ibaraki.app/-/snippets/3` (Original CF Worker for dynamic portainer templates). Thank you for the initial idea!
* Inspired by discussions and issues reported by the community on various forums regarding Portainer custom templates.
* Uses template sources provided by the Portainer team and various community members like Lissy93, Qballjos, SelfhostedPro, whose contributions to the self-hosting community are greatly appreciated.

## 📝 My Changes & Motivations (from original snippet)

Compared to the original GitLab snippet or other available solutions, this version aims to:
* **Update Source URLs**: The official Portainer template URL was updated, and other sources verified/added.
* **Improve Error Handling**: More resilient fetching, better handling of non-JSON responses (like `text/plain` from GitHub raw links), and timeout management.
* **Enhance Logging**: Added more detailed `console.log` statements for easier debugging via Cloudflare Worker logs.
* **Diagnostic Headers**: Implemented `X-Worker-*` response headers to provide a summary of fetched sources and processed templates.
* **Code Structure**: Refactored the worker script for better readability and maintenance.
* **Favicon Handling**: Added specific ignoring of `/favicon.ico` requests to keep logs cleaner.

The primary motivation was that some older solutions weren't working reliably due to changes in Portainer, template source availability/format, and error handling limitations.

## 📄 License

This project is provided as is. You are free to use, modify, and distribute it. If you wish to specify a formal open-source license, please create a `LICENSE` file (e.g., MIT License).

---
Maintained by Niyi Survey.
