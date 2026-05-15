package com.tfg.agile.app.user_service.controller;

import com.tfg.agile.app.user_service.dto.UserLookupResponseDto;
import com.tfg.agile.app.user_service.dto.UserSummaryDto;
import com.tfg.agile.app.user_service.service.UserProfileService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/users")
public class UsersController {

    private final UserProfileService userProfileService;

    public UsersController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping("/lookup")
    public UserLookupResponseDto lookup(@RequestParam("email") String email) {
        return userProfileService.lookupByEmail(email);
    }

    @PostMapping("/batch")
    public List<UserSummaryDto> batch(@RequestBody List<String> ids) {
        List<UUID> uuids = ids.stream().map(UUID::fromString).toList();
        return userProfileService.batchLookup(uuids);
    }
}