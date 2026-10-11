package com.example.pharmacy_management.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
	public record ErrorResponse(String error) {
	}

	@ExceptionHandler(ApiException.class)
	public org.springframework.http.ResponseEntity<ErrorResponse> handleApiException(ApiException exception) {
		return org.springframework.http.ResponseEntity.status(exception.getStatus())
				.body(new ErrorResponse(exception.getMessage()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	public ErrorResponse handleValidation(MethodArgumentNotValidException exception) {
		FieldError fieldError = exception.getBindingResult().getFieldErrors().stream().findFirst().orElse(null);
		return new ErrorResponse(fieldError == null ? "Please check the submitted details."
				: fieldError.getDefaultMessage());
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	public ErrorResponse handleUnreadableRequest() {
		return new ErrorResponse("The request contains invalid data.");
	}
}
