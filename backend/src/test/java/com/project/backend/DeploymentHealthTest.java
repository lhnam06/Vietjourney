package com.project.backend;

import org.junit.jupiter.api.Test;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class DeploymentHealthTest {

    @Test
    public void testBackendDeploymentIsReachable() throws Exception {
        // The URL of the deployed backend on Render
        String backendUrl = "https://vietjourney-backend.onrender.com/";
        
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
                
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(backendUrl))
                .GET()
                .build();
                
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        // Ensure we got a response back
        assertNotNull(response, "The response from the server should not be null");
        
        // Since the root path "/" does not have a public controller mapping 
        // and is protected by Spring Security (anyRequest().authenticated()),
        // it is expected to return 401 Unauthorized or 404 Not Found.
        // What matters is that we get a valid HTTP status code indicating the server is alive.
        int statusCode = response.statusCode();
        
        assertTrue(statusCode == 401 || statusCode == 404 || statusCode == 200, 
            "Expected a valid HTTP status code from the deployed backend (e.g., 401), but got: " + statusCode);
            
        System.out.println("Backend is reachable! Status code received: " + statusCode);
    }
}
