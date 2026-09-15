package com.tfg.agile.app.user_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserProfileRequestDto {

    @Size(max = 80)
    private String username;

    @Email
    @Size(max = 254)
    private String email;

    @Size(max = 120)
    private String fullName;

    @Size(max = 1200)
    private String bio;
}
