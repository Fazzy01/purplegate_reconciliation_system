import { backendFetch } from "@/lib/core/client";
import { useMutation } from "@tanstack/react-query";

export const useMutateSubmitUserDetails = ({options}) => {
    const submitDetails = (data) =>
        backendFetch({
            endpoint: "/user/create",
            body: data,
            method: "POST",
        });
    return useMutation({
        mutationFn: submitDetails,
        ...options,
    });

};
