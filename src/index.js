export default {
  async fetch(request, env, ctx) {
    const requestUrl = new URL(request.url);

    // Ignore browser requests for favicon.ico to keep logs clean
    if (requestUrl.pathname === "/favicon.ico") {
      return new Response(null, { status: 404 });
    }

    async function fetchAndParseJson(url, sourceDescription) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': `PortainerTemplatesWorker/1.3 (+${requestUrl.hostname})`,
            'Accept': 'application/json, text/plain, */*;q=0.8',
          }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error(`Failed to fetch '<span class="math-inline">\{sourceDescription\}' \(</span>{url}): HTTP ${response.status} ${response.statusText}`);
          return { error: `HTTP ${response.status} ${response.statusText}`, url, status: response.status };
        }

        const responseText = await response.text();
        const contentType = response.headers.get("content-type");

        if (responseText.trim().startsWith("<")) {
             console.warn(`Workspaceed '<span class="math-inline">\{sourceDescription\}' \(</span>{url}), but content appears to be HTML (starts with '<'). Content-Type: ${contentType}`);
             return { error: `Content appears to be HTML.`, url, content_snippet: responseText.substring(0,150) };
        }

        try {
            console.log(`Successfully fetched content from '<span class="math-inline">\{sourceDescription\}' \(</span>{url}). Content-Type: ${contentType}. Attempting to parse as JSON.`);
            return JSON.parse(responseText);
        } catch (e_json) {
            console.error(`Error parsing JSON from '<span class="math-inline">\{sourceDescription\}' \(</span>{url}): ${e_json.message}. Content-Type: <span class="math-inline">\{contentType\}\. Response text \(first 150 chars\)\: '</span>{responseText.substring(0,150)}'`);
            return { error: `JSON Parse Error: ${e_json.message}`, url, content_type: contentType, content_snippet: responseText.substring(0,150) };
        }

      } catch (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
            console.error(`Timeout fetching '<span class="math-inline">\{sourceDescription\}' \(</span>{url}) after 15 seconds.`);
            return { error: 'Fetch timeout after 15 seconds', url };
        }
        console.error(`Network or other error fetching '<span class="math-inline">\{sourceDescription\}' \(</span>{url}): ${e.message}`);
        return { error: e.message, url };
      }
    }

    let aggregatedTemplates = [];
    const failedSources = [];
    const successfulSources = [];

    const qTemplatesB64 = requestUrl.searchParams.get("templates");
    let userProvidedTemplateUrls = [];

    if (qTemplatesB64) {
      try {
        const decodedJsonString = atob(qTemplatesB64);
        const parsedUserUrls = JSON.parse(decodedJsonString);
        if (Array.isArray(parsedUserUrls) && parsedUserUrls.every(item => typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://')))) {
          userProvidedTemplateUrls = parsedUserUrls;
        } else {
          console.warn("Decoded 'templates' query parameter is not an array of valid HTTP/HTTPS URLs.");
          failedSources.push({url: "query_parameter_templates", reason: "Decoded 'templates' query parameter is not an array of valid HTTP/HTTPS URLs."});
        }
      } catch (e) {
        console.error("Error decoding/parsing 'templates' from query string:", e.message);
        failedSources.push({url: "query_parameter_templates", reason: `Error decoding/parsing: ${e.message}`});
      }
    }

    // Updated default list of template URLs
    const defaultTemplateProviderURLs = [
      "https://raw.githubusercontent.com/portainer/templates/master/templates.json", // Official Portainer
      "https://raw.githubusercontent.com/Lissy93/portainer-templates/main/templates.json",
      "https://raw.githubusercontent.com/xneo1/portainer_templates/master/Template/template.json",
      "https://raw.githubusercontent.com/technorabilia/portainer-templates/main/lsio/templates/templates.json", // User's preferred version
      "https://raw.githubusercontent.com/Qballjos/portainer_templates/master/Template/template.json",
      "https://raw.githubusercontent.com/TheLustriVA/portainer-templates-Nov-2022-collection/main/templates_2_2_rc_2_2.json",
      "https://raw.githubusercontent.com/ntv-one/portainer/main/template.json",
      "https://raw.githubusercontent.com/mycroftwilde/portainer_templates/master/Template/template.json",
      "https://raw.githubusercontent.com/mikestraney/portainer-templates/master/templates.json",
      "https://raw.githubusercontent.com/dnburgess/self-hosted-template/master/template.json",
      "https://raw.githubusercontent.com/SelfhostedPro/selfhosted_templates/portainer-2.0/Template/template.json",
      "https://raw.githubusercontent.com/mediadepot/templates/master/portainer.json",
      "https://raw.githubusercontent.com/novaspirit/pi-hosted/master/pi-hosted_template/template/portainer-v2.json", // Added
      "https://raw.githubusercontent.com/shmolf/portainer-templates/main/templates-2.0.json" // Added
    ];

    const allTemplateUrlsToFetch = [...new Set([...userProvidedTemplateUrls, ...defaultTemplateProviderURLs])];

    for (const tURL of allTemplateUrlsToFetch) {
      if (!tURL || typeof tURL !== 'string' || (!tURL.startsWith('http://') && !tURL.startsWith('https://'))) {
        console.warn(`Skipping invalid or non-HTTP/S URL: ${String(tURL || "undefined_or_invalid_url")}`);
        failedSources.push({ url: String(tURL || "undefined_or_invalid_url"), reason: "Invalid URL format or type" });
        continue;
      }

      console.log(`Workspaceing templates from: ${tURL}`);
      const result = await fetchAndParseJson(tURL, tURL);

      if (result.error) {
        failedSources.push({ url: tURL, reason: result.error, status: result.status, content_snippet: result.content_snippet });
      } else {
        let templatesFromSource = [];
        let sourceLogSuffix = "";

        if (result.templates && Array.isArray(result.templates)) {
          templatesFromSource = result.templates;
          sourceLogSuffix = "(found in result.templates property)";
        } else if (Array.isArray(result)) {
          templatesFromSource = result;
          sourceLogSuffix = "(root is an array of templates)";
        } else if (typeof result === 'object' && result !== null) {
            if (result.version && result.stacks && Array.isArray(result.stacks)) {
                templatesFromSource = result.stacks.map(stack => ({ ...stack, type: stack.type || 2, title: stack.title || stack.name || "Untitled Stack" }));
                sourceLogSuffix = "(converted from result.stacks property)";
            } else if (result.title && (result.image || (result.repository && result.repository.url))) {
                templatesFromSource = [result];
                sourceLogSuffix = "(single template object at root)";
            } else {
                let foundNested = false;
                for (const key in result) {
                    if (Array.isArray(result[key]) && result[key].length > 0 &&
                        result[key][0].title && (result[key][0].image || (result[key][0].repository && result[key][0].repository.url))) {
                        templatesFromSource = result[key];
                        sourceLogSuffix = `(found in nested array result.${key})`;
                        foundNested = true;
                        break;
                    }
                }
                if (!foundNested) sourceLogSuffix = "(unknown structure, no templates extracted)";
            }
        } else {
            sourceLogSuffix = "(unexpected result type, not an array or object)";
        }

        console.log(`Processing ${templatesFromSource.length} potential templates from ${tURL} ${sourceLogSuffix}`);
        let countValidTemplatesInSource = 0;
        for (const t of templatesFromSource) {
          if (t && typeof t.title === 'string' && t.title.trim() !== '' &&
              (typeof t.type === 'number' && [1, 2, 3].includes(t.type)) &&
              ( (typeof t.image === 'string' && t.image.trim() !== '') ||
                (t.repository && typeof t.repository.url === 'string' && t.repository.url.trim() !== '' &&
                 typeof t.repository.stackfile === 'string' && t.repository.stackfile.trim() !== '')
              )
             ) {
            aggregatedTemplates.push(t);
            countValidTemplatesInSource++;
          } else {
            console.warn(`Skipping malformed/incomplete template from <span class="math-inline">\{tURL\}\. Title\: '</span>{String(t.title || "N/A").substring(0,50)}', Type: '${t.type || "N/A"}'.`);
          }
        }

        if (countValidTemplatesInSource > 0) {
            successfulSources.push(tURL);
        } else if (!result.error) {
            failedSources.push({ url: tURL, reason: `No valid V2 templates extracted. ${sourceLogSuffix}`, content_snippet: JSON.stringify(result).substring(0,150) });
        }
      }
    }

    const uniqueTemplates = [];
    const titlesEncountered = new Set();
    for (const t of aggregatedTemplates) {
        if (t.title && typeof t.title === 'string') {
            const lowerCaseTitle = t.title.toLowerCase();
            if (!titlesEncountered.has(lowerCaseTitle)) {
                uniqueTemplates.push(t);
                titlesEncountered.add(lowerCaseTitle);
            }
        } else {
            console.warn(`Template found without a valid title, excluding from final list: ${JSON.stringify(t).substring(0,100)}`);
        }
    }

    uniqueTemplates.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

    const finalJsonResponse = {
      version: "2",
      templates: uniqueTemplates,
    };

    const response = new Response(JSON.stringify(finalJsonResponse), {
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=600"
      },
    });

    response.headers.append('X-Worker-Processed-Templates-Count', uniqueTemplates.length.toString());
    response.headers.append('X-Worker-Successful-Sources-Count', successfulSources.length.toString());
    response.headers.append('X-Worker-Failed-Sources-Count', failedSources.length.toString());
    const MAX_HEADER_LIST_LENGTH = 10;
    response.headers.append('X-Worker-Successful-Sources-List', JSON.stringify(successfulSources.slice(0, MAX_HEADER_LIST_LENGTH)));
    response.headers.append('X-Worker-Failed-Sources-List', JSON.stringify(failedSources.map(f => ({url: f.url, reason: String(f.reason).substring(0,100)})).slice(0, MAX_HEADER_LIST_LENGTH)));

    return response;
  },
};
