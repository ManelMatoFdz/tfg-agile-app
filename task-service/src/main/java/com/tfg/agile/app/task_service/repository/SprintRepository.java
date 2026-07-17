package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.Sprint;
import com.tfg.agile.app.task_service.entity.SprintStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SprintRepository extends JpaRepository<Sprint, UUID> {

    List<Sprint> findByProjectIdOrderByCreatedAtAsc(UUID projectId);

    Optional<Sprint> findByProjectIdAndStatus(UUID projectId, SprintStatus status);

    boolean existsByProjectIdAndStatus(UUID projectId, SprintStatus status);

    List<Sprint> findByStatusAndEndDateBefore(SprintStatus status, LocalDate date);

    List<Sprint> findByStatusAndStartDateLessThanEqual(SprintStatus status, LocalDate date);

    @Query("SELECT COALESCE(AVG(s.closedDoneStoryPoints), 0) FROM Sprint s " +
           "WHERE s.projectId = :projectId AND s.status = 'COMPLETED' AND s.closedDoneStoryPoints IS NOT NULL")
    double averageVelocity(@Param("projectId") UUID projectId);

    @Query("SELECT COUNT(s) FROM Sprint s WHERE s.projectId = :projectId AND s.status = 'COMPLETED'")
    long countCompleted(@Param("projectId") UUID projectId);

    @Query("SELECT COUNT(s) > 0 FROM Sprint s WHERE s.projectId = :projectId " +
           "AND s.status <> 'COMPLETED' " +
           "AND s.id <> :excludeId " +
           "AND s.startDate <= :endDate AND s.endDate >= :startDate")
    boolean existsOverlapping(@Param("projectId") UUID projectId,
                              @Param("excludeId") UUID excludeId,
                              @Param("startDate") LocalDate startDate,
                              @Param("endDate") LocalDate endDate);
}