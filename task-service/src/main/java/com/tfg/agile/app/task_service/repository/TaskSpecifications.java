package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.Label;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskPriority;
import com.tfg.agile.app.task_service.entity.TaskType;
import jakarta.persistence.criteria.Join;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.UUID;

public final class TaskSpecifications {

    private TaskSpecifications() {}

    public static Specification<Task> hasProjectId(UUID projectId) {
        return (root, query, cb) -> cb.equal(root.get("projectId"), projectId);
    }

    public static Specification<Task> hasSprintId(UUID sprintId) {
        return (root, query, cb) -> cb.equal(root.get("sprintId"), sprintId);
    }

    public static Specification<Task> inBacklog() {
        return (root, query, cb) -> cb.isNull(root.get("sprintId"));
    }

    public static Specification<Task> hasPriorityIn(List<TaskPriority> priorities) {
        return (root, query, cb) -> root.get("priority").in(priorities);
    }

    public static Specification<Task> hasStatusIn(List<String> statuses) {
        return (root, query, cb) -> root.get("status").in(statuses);
    }

    public static Specification<Task> hasAssigneeIn(List<UUID> assigneeIds) {
        return (root, query, cb) -> root.get("assigneeId").in(assigneeIds);
    }

    public static Specification<Task> hasLabelIn(List<UUID> labelIds) {
        return (root, query, cb) -> {
            query.distinct(true);
            Join<Task, Label> labelsJoin = root.join("labels");
            return labelsJoin.get("id").in(labelIds);
        };
    }

    public static Specification<Task> titleContains(String search) {
        return (root, query, cb) ->
                cb.like(cb.lower(root.get("title")), "%" + search.toLowerCase() + "%");
    }

    public static Specification<Task> isRootTask() {
        return (root, query, cb) -> cb.isNull(root.get("parentId"));
    }

    public static Specification<Task> isNotStoryType() {
        return (root, query, cb) -> cb.notEqual(root.get("type"), TaskType.STORY);
    }

    public static Specification<Task> hasParentId(UUID parentId) {
        return (root, query, cb) -> cb.equal(root.get("parentId"), parentId);
    }

    public static Specification<Task> hasType(TaskType type) {
        return (root, query, cb) -> cb.equal(root.get("type"), type);
    }
}