package api;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.net.InetSocketAddress;
import java.util.*;

/**
 * Simple Banking REST API — no dependencies, plain Java.
 *
 * Run:   javac src/api/BankingApi.java -d out && java -cp out api.BankingApi
 *
 * Endpoints:
 *   GET  http://localhost:8080/accounts        → list all accounts
 *   GET  http://localhost:8080/accounts?id=1   → get one account (404 if unknown)
 *   POST http://localhost:8080/accounts        → create account (JSON body)
 *   GET  http://localhost:8080/health          → health check
 *
 * Example POST body:
 *   {"id": "3", "owner": "Alice", "balance": 500}
 *
 * TESTABILITY NOTE (Module 3, Lesson 3)
 * -------------------------------------
 * The server used to be created inside main() on a hardcoded port 8080, which meant
 * a test could only run it by running the whole program. start(port) and
 * resetAccounts() were extracted so the integration tests in tests/java/api can
 * start a real server on a free port and begin from known data. Nothing about the
 * behaviour changed. This is the usual shape of the problem: code is rarely
 * untestable because the tests are hard to write, it is untestable because it never
 * offered a way in.
 */
public class BankingApi {

    /** The port the demo runs on when you start it by hand. */
    public static final int DEFAULT_PORT = 8080;

    // In-memory store (no database needed)
    static List<Map<String, String>> accounts = seedAccounts();

    public static void main(String[] args) throws Exception {
        HttpServer server = start(DEFAULT_PORT);
        System.out.println("API running on http://localhost:"
            + server.getAddress().getPort() + "/accounts");
    }

    /**
     * Start the API on the given port and return the running server.
     * Pass 0 to let the operating system pick a free port — which is what the
     * integration tests do, so two test runs can never collide on port 8080.
     */
    public static HttpServer start(int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/accounts", BankingApi::handleAccounts);
        server.createContext("/health", BankingApi::handleHealth);
        server.start();
        return server;
    }

    /** Restore the two demo accounts. Used by tests so each one starts from the same data. */
    static void resetAccounts() {
        accounts = seedAccounts();
    }

    static List<Map<String, String>> seedAccounts() {
        return new ArrayList<>(Arrays.asList(
            account("1", "Jan Janssen",  "1200.00"),
            account("2", "Marie Dupont", "850.50")
        ));
    }

    static void handleHealth(HttpExchange ex) throws IOException {
        respond(ex, 200, "{\"status\": \"ok\"}");
    }

    static void handleAccounts(HttpExchange ex) throws IOException {
        String method = ex.getRequestMethod();

        if ("GET".equals(method)) {
            String query = ex.getRequestURI().getQuery(); // e.g. "id=1"

            if (query != null && query.startsWith("id=")) {
                String id = query.substring(3);
                Optional<Map<String, String>> found = accounts.stream()
                    .filter(a -> id.equals(a.get("id")))
                    .findFirst();

                // An account we do not have is a 404, not a 200 with an error inside it.
                // Returning 200 here made every monitoring dashboard count a failed
                // lookup as a successful request.
                if (found.isEmpty()) {
                    respond(ex, 404, "{\"error\": \"not found\"}");
                } else {
                    respond(ex, 200, toJson(found.get()));
                }
            } else {
                respond(ex, 200, toJsonArray(accounts));
            }

        } else if ("POST".equals(method)) {
            String raw = new String(ex.getRequestBody().readAllBytes());
            Map<String, String> account = parseJson(raw);
            accounts.add(account);
            respond(ex, 201, toJson(account));

        } else {
            respond(ex, 405, "{\"error\": \"method not allowed\"}");
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────

    static Map<String, String> account(String id, String owner, String balance) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("id", id); m.put("owner", owner); m.put("balance", balance);
        return m;
    }

    static void respond(HttpExchange ex, int code, String body) throws IOException {
        byte[] bytes = body.getBytes();
        ex.getResponseHeaders().set("Content-Type", "application/json");
        ex.sendResponseHeaders(code, bytes.length);
        ex.getResponseBody().write(bytes);
        ex.getResponseBody().close();
    }

    /** Very small JSON serialiser — avoids external libraries. */
    static String toJson(Map<String, String> m) {
        StringBuilder sb = new StringBuilder("{");
        m.forEach((k, v) -> sb.append("\"").append(k).append("\": \"").append(v).append("\", "));
        if (sb.length() > 1) sb.setLength(sb.length() - 2); // trim last comma
        return sb.append("}").toString();
    }

    static String toJsonArray(List<Map<String, String>> list) {
        StringBuilder sb = new StringBuilder("[");
        list.forEach(m -> sb.append(toJson(m)).append(", "));
        if (sb.length() > 1) sb.setLength(sb.length() - 2);
        return sb.append("]").toString();
    }

    /**
     * Minimal JSON parser for flat {"key": "value"} objects only.
     * Known limitation: it splits on every comma and colon, so a value that
     * contains one (a customer name written "Dupont, Marie") is mangled.
     * BankingApiJsonTest pins that behaviour and UAT case UAT-09 asks a human
     * to go looking for the damage it does.
     */
    static Map<String, String> parseJson(String json) {
        Map<String, String> map = new LinkedHashMap<>();
        json = json.replaceAll("[{}\"]", "");
        for (String pair : json.split(",")) {
            String[] kv = pair.split(":", 2);
            if (kv.length == 2) map.put(kv[0].trim(), kv[1].trim());
        }
        return map;
    }
}
