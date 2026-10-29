package api;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * INTEGRATION TESTS — the middle of the test pyramid.
 *
 * Nothing here is faked. A real HTTP server is started, real requests go over a
 * real socket, and the status codes and bodies are the ones a caller would get.
 * That is the difference from the unit tests next door: those check one method's
 * answer, these check that the parts still fit together — routing, query
 * parsing, status codes and the store all at once.
 *
 * Maven runs these separately from the unit tests (the *IT suffix is what makes
 * the difference), because they are slower and because a failure here usually
 * means something different: the pieces work, the wiring does not.
 */
@DisplayName("Banking API over HTTP")
class BankingApiIT {

    private static HttpServer server;
    private static HttpClient client;
    private static String baseUrl;

    @BeforeAll
    static void startTheApi() throws Exception {
        // Port 0 means "any free port". Hardcoding 8080 would make the suite fail
        // whenever somebody happened to have the demo already running.
        server = BankingApi.start(0);
        baseUrl = "http://localhost:" + server.getAddress().getPort();
        client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    @AfterAll
    static void stopTheApi() {
        if (server != null) server.stop(0);
    }

    @BeforeEach
    void startFromTheSameData() {
        // Every test begins with the same two accounts. Tests that inherit the
        // previous test's data are the classic source of a suite that passes
        // alone and fails when run in a different order.
        BankingApi.resetAccounts();
    }

    @Test
    @DisplayName("The health endpoint answers, which is what a load balancer asks")
    void healthEndpointReportsOk() throws Exception {
        HttpResponse<String> response = get("/health");

        assertEquals(200, response.statusCode());
        assertEquals("{\"status\": \"ok\"}", response.body());
        assertEquals("application/json", response.headers().firstValue("Content-Type").orElse(""));
    }

    @Test
    @DisplayName("Asking for all accounts returns the whole list")
    void allAccountsAreListed() throws Exception {
        HttpResponse<String> response = get("/accounts");

        assertEquals(200, response.statusCode());
        assertTrue(response.body().startsWith("["), "a list should come back as a JSON array");
        assertTrue(response.body().contains("Jan Janssen"), "first demo account missing");
        assertTrue(response.body().contains("Marie Dupont"), "second demo account missing");
    }

    @Test
    @DisplayName("Asking for one account by id returns only that account")
    void oneAccountIsReturnedById() throws Exception {
        HttpResponse<String> response = get("/accounts?id=2");

        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("Marie Dupont"), "the requested account is missing");
        assertFalse(response.body().contains("Jan Janssen"), "a lookup by id must not leak other customers");
    }

    @Test
    @DisplayName("Asking for an account that does not exist is a 404, not a 200")
    void unknownAccountIsNotFound() throws Exception {
        HttpResponse<String> response = get("/accounts?id=999");

        // The API used to answer 200 here with an error message in the body.
        // Every dashboard counting HTTP status codes read that as a success, so a
        // service returning nothing but "not found" all day looked perfectly
        // healthy. This test exists to stop that coming back.
        assertEquals(404, response.statusCode(), "an unknown account must not be reported as success");
        assertTrue(response.body().contains("not found"));
    }

    @Test
    @DisplayName("A new account survives to the next request")
    void createdAccountIsVisibleAfterwards() throws Exception {
        HttpResponse<String> created = client.send(
            HttpRequest.newBuilder(URI.create(baseUrl + "/accounts"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                    "{\"id\": \"3\", \"owner\": \"Ivan Petrov\", \"balance\": \"500\"}"))
                .build(),
            HttpResponse.BodyHandlers.ofString());

        assertEquals(201, created.statusCode(), "creating something should answer 201, not 200");

        // Two requests, one after the other. A unit test cannot ask this question:
        // it is about what the service remembered between calls.
        HttpResponse<String> listed = get("/accounts");
        assertTrue(listed.body().contains("Ivan Petrov"), "the account was accepted but is not in the list");
    }

    private HttpResponse<String> get(String path) throws Exception {
        return client.send(
            HttpRequest.newBuilder(URI.create(baseUrl + path)).GET().build(),
            HttpResponse.BodyHandlers.ofString());
    }
}
