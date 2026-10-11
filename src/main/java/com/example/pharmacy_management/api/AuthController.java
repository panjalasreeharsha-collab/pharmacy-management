package com.example.pharmacy_management.api;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

import com.example.pharmacy_management.data.AccountRepository;
import com.example.pharmacy_management.data.AccountRepository.ShopAccount;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	public record CsrfResponse(String csrfToken) {
	}

	public record ShopProfile(String username, String shopName, String csrfToken) {
	}

	public record SignInRequest(
			@NotBlank(message = "Enter your username.")
			@Size(max = 32, message = "Username must be 32 characters or fewer.") String username,
			@NotBlank(message = "Enter your password.")
			@Size(max = 72, message = "Password must be 72 characters or fewer.") String password) {
	}

	public record SignUpRequest(
			@NotBlank(message = "Enter a username.")
			@Pattern(regexp = "^[A-Za-z][A-Za-z0-9._-]{2,31}$",
					message = "Username must start with a letter and contain 3–32 letters, numbers, dots, hyphens, or underscores.")
			String username,
			@NotBlank(message = "Enter your shop name.")
			@Size(min = 2, max = 100, message = "Shop name must be between 2 and 100 characters.")
			String shopName,
			@NotBlank(message = "Create a password.")
			@Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters.")
			String password) {
	}

	private final AccountRepository accounts;
	private final PasswordEncoder passwordEncoder;
	private final ApiSecurityConfiguration security;

	public AuthController(AccountRepository accounts, PasswordEncoder passwordEncoder, ApiSecurityConfiguration security) {
		this.accounts = accounts;
		this.passwordEncoder = passwordEncoder;
		this.security = security;
	}

	@GetMapping("/csrf")
	public CsrfResponse csrf(HttpServletRequest request) {
		HttpSession session = request.getSession(true);
		synchronized (session) {
			Object existingToken = session.getAttribute(ApiSecurityConfiguration.CSRF_ATTRIBUTE);
			if (existingToken instanceof String token) {
				return new CsrfResponse(token);
			}
			String token = security.createCsrfToken();
			session.setAttribute(ApiSecurityConfiguration.CSRF_ATTRIBUTE, token);
			return new CsrfResponse(token);
		}
	}

	@GetMapping("/me")
	public ShopProfile currentShop(HttpSession session) {
		Object token = session.getAttribute(ApiSecurityConfiguration.CSRF_ATTRIBUTE);
		return new ShopProfile(ApiSecurityConfiguration.requireUsername(session),
				ApiSecurityConfiguration.requireShopName(session), (String) token);
	}

	@PostMapping("/signup")
	public ShopProfile signUp(@Valid @RequestBody SignUpRequest request, HttpServletRequest servletRequest) {
		String username = normalizeUsername(request.username());
		if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "Password must be no longer than 72 UTF-8 bytes.");
		}
		if (accounts.usernameExists(username)) {
			throw new ApiException(HttpStatus.CONFLICT, "That username is already in use. Please choose another.");
		}

		ShopAccount account;
		try {
			account = accounts.createShop(username, request.shopName().trim(), passwordEncoder.encode(request.password()));
		} catch (org.springframework.dao.DuplicateKeyException exception) {
			throw new ApiException(HttpStatus.CONFLICT, "That username is already in use. Please choose another.");
		}
		return establishSession(servletRequest, account);
	}

	@PostMapping("/signin")
	public ShopProfile signIn(@Valid @RequestBody SignInRequest request, HttpServletRequest servletRequest) {
		String username = normalizeUsername(request.username());
		if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
			throw new ApiException(HttpStatus.UNAUTHORIZED, "Username or password is incorrect.");
		}
		ShopAccount account = accounts.findByUsername(username)
				.filter(candidate -> passwordEncoder.matches(request.password(), candidate.passwordHash()))
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Username or password is incorrect."));
		return establishSession(servletRequest, account);
	}

	@PostMapping("/signout")
	public void signOut(HttpServletRequest request) {
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.invalidate();
		}
	}

	private ShopProfile establishSession(HttpServletRequest request, ShopAccount account) {
		HttpSession session = request.getSession(true);
		request.changeSessionId();
		session.setAttribute(ApiSecurityConfiguration.SHOP_ID_ATTRIBUTE, account.shopId());
		session.setAttribute(ApiSecurityConfiguration.USERNAME_ATTRIBUTE, account.username());
		session.setAttribute(ApiSecurityConfiguration.SHOP_NAME_ATTRIBUTE, account.shopName());
		String csrfToken = security.createCsrfToken();
		session.setAttribute(ApiSecurityConfiguration.CSRF_ATTRIBUTE, csrfToken);
		return new ShopProfile(account.username(), account.shopName(), csrfToken);
	}

	private String normalizeUsername(String username) {
		return username.trim().toLowerCase(Locale.ROOT);
	}
}
