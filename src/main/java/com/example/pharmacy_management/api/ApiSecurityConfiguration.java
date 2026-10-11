package com.example.pharmacy_management.api;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration(proxyBeanMethods = false)
public class ApiSecurityConfiguration implements WebMvcConfigurer {
	public static final String SHOP_ID_ATTRIBUTE = "medstock.shopId";
	public static final String USERNAME_ATTRIBUTE = "medstock.username";
	public static final String SHOP_NAME_ATTRIBUTE = "medstock.shopName";
	public static final String CSRF_ATTRIBUTE = "medstock.csrfToken";
	public static final String CSRF_HEADER = "X-CSRF-Token";
	private static final String CSRF_PATH = "/api/auth/csrf";
	private static final String SIGN_IN_PATH = "/api/auth/signin";
	private static final String SIGN_UP_PATH = "/api/auth/signup";

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final SecureRandom secureRandom = new SecureRandom();

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder(12);
	}

	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(apiAuthenticationInterceptor()).addPathPatterns("/api/**");
	}

	@Bean
	HandlerInterceptor apiAuthenticationInterceptor() {
		return new HandlerInterceptor() {
			@Override
			public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
					throws Exception {
				String path = request.getServletPath();
				if (CSRF_PATH.equals(path)) {
					return true;
				}

				if (SIGN_IN_PATH.equals(path) || SIGN_UP_PATH.equals(path)) {
					return true;
				}

				HttpSession session = request.getSession(false);
				if (requiresCsrf(request) && !hasValidCsrfToken(request, session)) {
					writeError(response, HttpServletResponse.SC_FORBIDDEN, "Your session token is invalid. Refresh and try again.");
					return false;
				}

				if (session == null || !(session.getAttribute(SHOP_ID_ATTRIBUTE) instanceof Long)) {
					writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "Please sign in to continue.");
					return false;
				}

				return true;
			}
		};
	}

	public String createCsrfToken() {
		byte[] token = new byte[32];
		secureRandom.nextBytes(token);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(token);
	}

	private boolean requiresCsrf(HttpServletRequest request) {
		String method = request.getMethod();
		return !("GET".equals(method) || "HEAD".equals(method) || "OPTIONS".equals(method));
	}

	private boolean hasValidCsrfToken(HttpServletRequest request, HttpSession session) {
		if (session == null) {
			return false;
		}
		Object expected = session.getAttribute(CSRF_ATTRIBUTE);
		String provided = request.getHeader(CSRF_HEADER);
		return expected instanceof String expectedToken && provided != null
				&& MessageDigest.isEqual(expectedToken.getBytes(StandardCharsets.UTF_8),
						provided.getBytes(StandardCharsets.UTF_8));
	}

	private void writeError(HttpServletResponse response, int status, String message) throws Exception {
		response.setStatus(status);
		response.setContentType("application/json");
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		objectMapper.writeValue(response.getWriter(), new ApiExceptionHandler.ErrorResponse(message));
	}

	public static long requireShopId(HttpSession session) {
		Object shopId = session.getAttribute(SHOP_ID_ATTRIBUTE);
		if (shopId instanceof Long id) {
			return id;
		}
		throw new IllegalStateException("An authenticated shop session is required.");
	}

	public static String requireUsername(HttpSession session) {
		Object username = session.getAttribute(USERNAME_ATTRIBUTE);
		if (username instanceof String value) {
			return value;
		}
		throw new IllegalStateException("An authenticated shop session is required.");
	}

	public static String requireShopName(HttpSession session) {
		Object shopName = session.getAttribute(SHOP_NAME_ATTRIBUTE);
		if (shopName instanceof String value) {
			return value;
		}
		throw new IllegalStateException("An authenticated shop session is required.");
	}
}
