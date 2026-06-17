sap.ui.define([], function () {
	"use strict";

	/**
	 * Security Utility Module
	 * Provides helper functions for input sanitization, encoding, and secure operations
	 */
	return {
		/**
		 * Sanitize input to prevent OData injection
		 * Escapes single quotes and removes potentially dangerous characters
		 * @param {string} input - The input string to sanitize
		 * @returns {string} - Sanitized string safe for OData queries
		 */
		sanitizeODataInput: function (input) {
			if (typeof input !== "string") {
				return "";
			}
			// Escape single quotes by doubling them (OData standard)
			// Remove or escape other potentially dangerous characters
			return input
				.replace(/'/g, "''")  // Escape single quotes
				.replace(/\\/g, "");   // Remove backslashes
				// Control characters are handled by the OData library
		},

		/**
		 * Sanitize input for HTML display to prevent XSS
		 * @param {string} input - The input string to sanitize
		 * @returns {string} - HTML-safe string
		 */
		sanitizeHTML: function (input) {
			if (typeof input !== "string") {
				return "";
			}
			var element = document.createElement("div");
			element.textContent = input;
			return element.innerHTML;
		},

		/**
		 * Validate email format
		 * @param {string} email - Email address to validate
		 * @returns {boolean} - True if valid email format
		 */
		isValidEmail: function (email) {
			if (typeof email !== "string") {
				return false;
			}
			// RFC 5322 compliant email regex (simplified)
			var emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
			return emailRegex.test(email) && email.length <= 254;
		},

		/**
		 * Validate that input contains only allowed characters
		 * @param {string} input - Input to validate
		 * @param {string} allowedPattern - Regex pattern of allowed characters
		 * @returns {boolean} - True if input only contains allowed characters
		 */
		validateInput: function (input, allowedPattern) {
			if (typeof input !== "string") {
				return false;
			}
			var regex = new RegExp("^[" + allowedPattern + "]*$");
			return regex.test(input);
		},

		/**
		 * Validate alphanumeric input (letters, numbers, and common safe characters)
		 * @param {string} input - Input to validate
		 * @returns {boolean} - True if input is alphanumeric
		 */
		isAlphanumeric: function (input) {
			return this.validateInput(input, "a-zA-Z0-9\\s\\-_.");
		},

		/**
		 * Sanitize filename to prevent path traversal attacks
		 * @param {string} filename - The filename to sanitize
		 * @returns {string} - Safe filename
		 */
		sanitizeFilename: function (filename) {
			if (typeof filename !== "string") {
				return "";
			}
			// Remove path traversal attempts and dangerous characters
			return filename
				.replace(/\.\./g, "")           // Remove parent directory references
				.replace(/[/\\]/g, "")          // Remove path separators
				.replace(/[<>:"|?*]/g, "");     // Remove Windows-forbidden characters
		},

		/**
		 * Check password strength
		 * @param {string} password - Password to check
		 * @returns {object} - Object with isValid boolean and message string
		 */
		checkPasswordStrength: function (password) {
			if (typeof password !== "string") {
				return { isValid: false, message: "Password must be a string" };
			}

			var result = { isValid: true, message: "Password meets requirements" };

			if (password.length < 8) {
				return { isValid: false, message: "Password must be at least 8 characters long" };
			}

			if (password.length > 128) {
				return { isValid: false, message: "Password must be less than 128 characters" };
			}

			if (!/[A-Z]/.test(password)) {
				return { isValid: false, message: "Password must contain at least one uppercase letter" };
			}

			if (!/[a-z]/.test(password)) {
				return { isValid: false, message: "Password must contain at least one lowercase letter" };
			}

			if (!/[0-9]/.test(password)) {
				return { isValid: false, message: "Password must contain at least one number" };
			}

			if (!/[#?!@$%^&*_-]/.test(password)) {
				return { isValid: false, message: "Password must contain at least one special character (#?!@$%^&*_-)" };
			}

			return result;
		},

		/**
		 * Generate a cryptographically secure random string
		 * @param {number} length - Length of the random string
		 * @returns {string} - Random string
		 */
		generateSecureRandom: function (length) {
			var array = new Uint8Array(length);
			window.crypto.getRandomValues(array);
			return Array.from(array, function(byte) {
				return ("0" + byte.toString(16)).slice(-2);
			}).join("").slice(0, length);
		},

		/**
		 * Encode data for safe URL usage
		 * @param {string} data - Data to encode
		 * @returns {string} - URL-safe encoded string
		 */
		encodeForURL: function (data) {
			if (typeof data !== "string") {
				return "";
			}
			return encodeURIComponent(data);
		},

		/**
		 * Validate URL to prevent open redirect vulnerabilities
		 * @param {string} url - URL to validate
		 * @param {array} allowedDomains - List of allowed domains
		 * @returns {boolean} - True if URL is safe
		 */
		isValidURL: function (url, allowedDomains) {
			if (typeof url !== "string") {
				return false;
			}

			try {
				var parsedUrl = new URL(url);
				
				// Only allow https
				if (parsedUrl.protocol !== "https:") {
					return false;
				}

				// Check against allowed domains if provided
				if (allowedDomains && Array.isArray(allowedDomains)) {
					return allowedDomains.some(function(domain) {
						return parsedUrl.hostname === domain || parsedUrl.hostname.endsWith("." + domain);
					});
				}

				return true;
			} catch (_e) {
				return false;
			}
		},

		/**
		 * Rate limiting helper - tracks request timestamps
		 * @param {string} key - Unique key for the rate limit (e.g., "login")
		 * @param {number} maxRequests - Maximum requests allowed
		 * @param {number} windowMs - Time window in milliseconds
		 * @returns {boolean} - True if request is allowed
		 */
		checkRateLimit: function (key, maxRequests, windowMs) {
			var storageKey = "rateLimit_" + key;
			var now = Date.now();
			var timestamps = [];

			try {
				var stored = sessionStorage.getItem(storageKey);
				if (stored) {
					timestamps = JSON.parse(stored);
				}
			} catch (_e) {
				timestamps = [];
			}

			// Remove old timestamps outside the window
			timestamps = timestamps.filter(function(ts) {
				return now - ts < windowMs;
			});

			if (timestamps.length >= maxRequests) {
				return false;
			}

			timestamps.push(now);
			sessionStorage.setItem(storageKey, JSON.stringify(timestamps));
			return true;
		}
	};
});