package com.tfg.agile.app.user_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequestDto {

    private String currentPassword;

    @NotBlank
    @Size(min = 6, max = 200)
    private String newPassword;
}
